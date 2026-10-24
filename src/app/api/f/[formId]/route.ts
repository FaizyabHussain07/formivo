import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { PRODUCTION_URL } from '@/lib/app-config';
import {
  createLead,
  sha256,
  submissionServiceClient,
  SubmissionError,
} from '@/lib/submissions';

/**
 * POST /api/f/[formId]  →  https://formivo.faizyab.me/api/f/YOUR_FORM_ID
 *
 * The plain-HTML integration surface: a developer only has to set the form's
 * `action` and `method="POST"`. No SDK, no visitor login, no custom backend.
 *
 * Accepted content types:
 *   application/x-www-form-urlencoded   (native HTML form post)
 *   multipart/form-data                 (native HTML form post with files)
 *   application/json                    (fetch / server-side callers)
 *
 * Trust model: the form ID is a routing key, not an authorization grant. The
 * workspace association always comes from the verified form row, never from
 * the request body. Spam defence is a honeypot field plus per-IP rate limiting,
 * payload caps and strict field validation.
 */

const MAX_BODY_BYTES = 100 * 1024; // 100 KB
const MAX_FIELDS = 60;
const MAX_KEY_LENGTH = 64;
const MAX_VALUE_LENGTH = 8_000;
const RATE_LIMIT_MAX = 60;
const RATE_WINDOW_MS = 60_000;

/** Optional honeypot inputs. Non-empty means a bot filled in a hidden field. */
const HONEYPOT_FIELDS = ['website', 'url', 'fax', 'hp', '_gotcha'];
/** Reserved fields handled by the endpoint instead of stored as lead data. */
const RESERVED_FIELDS = new Set(['_redirect', '_next']);

const APP_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : PRODUCTION_URL)
).replace(/\/$/, '');

/* ── Responses ─────────────────────────────────────────────────── */

function wantsHtml(request: NextRequest): boolean {
  return (request.headers.get('accept') ?? '').includes('text/html');
}

function jsonError(code: string, message: string, status: number, requestId: string) {
  return NextResponse.json(
    { success: false, error: { code, message, requestId } },
    { status, headers: { 'x-request-id': requestId } },
  );
}

/* Entities are assembled from the ampersand code point so this module never
   depends on literal HTML entity text in source. */
const AMP = String.fromCharCode(38);
const HTML_ESCAPES: Record<string, string> = {
  '&': `${AMP}amp;`,
  '<': `${AMP}lt;`,
  '>': `${AMP}gt;`,
  '"': `${AMP}quot;`,
  "'": `${AMP}#39;`,
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function page(title: string, message: string, tone: 'success' | 'error', status: number, requestId: string) {
  const accent = tone === 'success' ? '#0F766E' : '#DC2626';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} · Formivo</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#F8FAFC; color:#0F172A; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  main { width:100%; max-width:420px; margin:24px; background:#fff; border:1px solid #E2E8F0;
         border-radius:12px; padding:32px 28px; text-align:center; box-shadow:0 6px 16px rgba(15,23,42,.06); }
  .mark { display:inline-flex; align-items:center; gap:8px; font-weight:600; letter-spacing:-.01em; }
  .dot { width:10px; height:10px; border-radius:999px; background:${accent}; }
  h1 { font-size:18px; margin:20px 0 8px; letter-spacing:-.01em; }
  p { margin:0; font-size:14px; line-height:1.6; color:#475569; }
  a.back { display:inline-block; margin-top:22px; padding:9px 16px; border-radius:8px; background:${accent};
           color:#fff; font-size:14px; font-weight:500; text-decoration:none; }
  a.back:hover { filter:brightness(1.08); }
  code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; color:#94A3B8; }
</style>
</head>
<body>
<main>
  <span class="mark"><span class="dot"></span>Formivo</span>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
  <a class="back" href="javascript:history.back()">Go back</a>
  <p style="margin-top:18px"><code>${escapeHtml(requestId)}</code></p>
</main>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-request-id': requestId },
  });
}

/* ── Validation helpers ────────────────────────────────────────── */

/**
 * Only same-origin destinations are allowed, so a crafted `?_redirect=`
 * cannot bounce visitors to another site (open-redirect protection).
 */
function safeRedirectTarget(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) {
    return value;
  }
  try {
    const url = new URL(value);
    if (url.origin === new URL(APP_ORIGIN).origin) return url.toString();
  } catch {
    /* not a URL */
  }
  return null;
}

type ParsedFields = Record<string, string | string[]>;

async function parseBody(request: NextRequest): Promise<ParsedFields> {
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();

  if (contentType.includes('application/json')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await request.text());
    } catch {
      throw new SubmissionError('INVALID_REQUEST', 'Request body is not valid JSON.');
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new SubmissionError('INVALID_REQUEST', 'The request body must be a JSON object.');
    }
    const obj = parsed as Record<string, unknown>;
    // Accept both `{data:{…}}` (v1 shape) and a flat field object.
    const source =
      typeof obj.data === 'object' && obj.data !== null && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : obj;
    const out: ParsedFields = {};
    for (const [key, value] of Object.entries(source)) {
      if (RESERVED_FIELDS.has(key)) continue;
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        out[key] = value.map((v) => stringifyValue(v));
      } else {
        out[key] = stringifyValue(value);
      }
    }
    return out;
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new SubmissionError('INVALID_REQUEST', 'The form data could not be parsed.');
    }
    const out: ParsedFields = {};
    for (const [key, value] of formData.entries()) {
      if (RESERVED_FIELDS.has(key)) continue;
      // Binary uploads are not stored in V1 — file fields are skipped.
      if (typeof value !== 'string') continue;
      if (out[key] === undefined) {
        out[key] = value;
      } else if (Array.isArray(out[key])) {
        (out[key] as string[]).push(value);
      } else {
        out[key] = [out[key] as string, value];
      }
    }
    return out;
  }

  throw new SubmissionError(
    'INVALID_REQUEST',
    'Unsupported Content-Type. Use application/x-www-form-urlencoded, multipart/form-data, or application/json.',
  );
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function validateFields(fields: ParsedFields): Record<string, string | string[]> {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    throw new SubmissionError('INVALID_REQUEST', 'The form did not contain any fields.');
  }
  if (entries.length > MAX_FIELDS) {
    throw new SubmissionError('INVALID_REQUEST', `A submission may contain at most ${MAX_FIELDS} fields.`);
  }

  const cleaned: Record<string, string | string[]> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim();
    if (!key || key.length > MAX_KEY_LENGTH) {
      throw new SubmissionError('INVALID_REQUEST', 'A field name is missing or too long.');
    }
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001F\u007F]/.test(key)) {
      throw new SubmissionError('INVALID_REQUEST', 'Field names must not contain control characters.');
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    if (values.length > 40) {
      throw new SubmissionError('INVALID_REQUEST', 'A field has too many repeated values.');
    }
    const checked = values.map((value) => {
      if (typeof value !== 'string') {
        throw new SubmissionError('INVALID_REQUEST', 'Field values must be text.');
      }
      if (value.length > MAX_VALUE_LENGTH) {
        throw new SubmissionError('INVALID_REQUEST', 'A field value is too long.');
      }
      return value;
    });

    cleaned[key] = Array.isArray(rawValue) ? checked : checked[0];
  }
  return cleaned;
}

function isHoneypotTripped(fields: ParsedFields): boolean {
  return HONEYPOT_FIELDS.some((name) => {
    const value = fields[name];
    if (value === undefined) return false;
    return (Array.isArray(value) ? value.join('') : value).trim().length > 0;
  });
}

/* ── Handler ───────────────────────────────────────────────────── */

export function GET() {
  return NextResponse.json(
    { success: false, error: { code: 'INVALID_REQUEST', message: 'Use POST to submit this form.' } },
    { status: 405, headers: { allow: 'POST' } },
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const requestId = 'req_' + crypto.randomUUID().slice(0, 8);
  const html = wantsHtml(request);

  try {
    const { formId } = await params;

    if (!formId || formId.length > 64) {
      throw new SubmissionError('NOT_FOUND', 'No form exists for this endpoint.');
    }

    // 1. Size — checked before the body is materialised.
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      throw new SubmissionError('PAYLOAD_TOO_LARGE', 'This submission is too large.');
    }

    // 2. Parse
    const parsed = await parseBody(request);
    const rawBody = JSON.stringify(parsed);
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      throw new SubmissionError('PAYLOAD_TOO_LARGE', 'This submission is too large.');
    }

    // 3. Rate limit (per IP, per minute)
    const rate = checkRateLimit(`f:${clientIp(request.headers)}:${formId}`, {
      max: RATE_LIMIT_MAX,
      windowMs: RATE_WINDOW_MS,
    });
    if (!rate.allowed) {
      if (html) {
        return page('Too many requests', 'Please wait a moment and try submitting again.', 'error', 429, requestId);
      }
      const res = jsonError('RATE_LIMITED', 'Too many requests. Please try again shortly.', 429, requestId);
      res.headers.set('retry-after', String(rate.retryAfterSec));
      return res;
    }

    // 4. Field validation (before any database work)
    const fields = validateFields(parsed);

    const redirectTarget = safeRedirectTarget(
      (parsed._redirect as string) ?? (parsed._next as string) ?? null,
    );

    // 5. Spam: a filled honeypot is silently accepted and dropped.
    if (isHoneypotTripped(parsed)) {
      console.log('[submission_honeypot]', { requestId, formId });
      if (redirectTarget) return NextResponse.redirect(new URL(redirectTarget, APP_ORIGIN), 303);
      if (html) return page('Thank you', 'Your submission has been received.', 'success', 200, requestId);
      return NextResponse.json({ success: true, message: 'Submission received.' }, { status: 200 });
    }

    // 6. Store — workspace association comes from the form row only.
    const db = submissionServiceClient();
    const { leadId } = await createLead(db, {
      formPublicId: formId,
      data: fields,
      metadata: {
        source: 'html-form',
        userAgent: (request.headers.get('user-agent') ?? '').slice(0, 200),
        submittedAt: new Date().toISOString(),
      },
      requestHash: sha256(rawBody),
      idempotencyKey: null,
    });

    console.log('[submission_received]', { requestId, formId, leadId });

    if (redirectTarget) {
      return NextResponse.redirect(new URL(redirectTarget, APP_ORIGIN), 303);
    }
    if (html) {
      return page('Thank you', 'Your submission has been received.', 'success', 200, requestId);
    }
    return NextResponse.json(
      { success: true, leadId, message: 'Submission received.' },
      { status: 200, headers: { 'x-request-id': requestId } },
    );
  } catch (err) {
    if (err instanceof SubmissionError) {
      const message = err.code === 'QUOTA_EXCEEDED'
        ? 'This form has reached its monthly submission limit.'
        : err.message;

      if (err.code === 'NOT_FOUND' || err.code === 'FORM_INACTIVE') {
        console.log('[submission_rejected]', { requestId, code: err.code });
      } else {
        console.error('[submission_error]', { requestId, code: err.code });
      }

      if (html) {
        const title =
          err.code === 'NOT_FOUND' ? 'Form not found'
          : err.code === 'FORM_INACTIVE' ? 'This form is closed'
          : err.code === 'QUOTA_EXCEEDED' ? 'Submission limit reached'
          : err.code === 'PAYLOAD_TOO_LARGE' ? 'Submission too large'
          : err.code === 'INVALID_REQUEST' ? 'Submission rejected'
          : 'Something went wrong';
        return page(title, message, 'error', err.status, requestId);
      }
      return jsonError(err.code, message, err.status, requestId);
    }

    console.error('[submission_exception]', { requestId, error: String(err) });
    if (html) {
      return page('Something went wrong', 'We could not save your submission. Please try again.', 'error', 500, requestId);
    }
    return jsonError('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500, requestId);
  }
}