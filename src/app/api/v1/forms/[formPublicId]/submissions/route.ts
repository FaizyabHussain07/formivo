import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'crypto';
import { PLANS, DEFAULT_PLAN, type PlanId } from '@/lib/plans';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/v1/forms/{formPublicId}/submissions  (PRD §23, §58–62)
 *
 * Public integration surface. Pipeline:
 *   method → content-type → size → JSON → resolve form → status →
 *   secret → rate limit → payload validation → quota → idempotency →
 *   atomic create (RPC) → success response
 *
 * Auth: Bearer FORM_SECRET (SHA-256 hash compared in constant time).
 * No cookies, no session — this endpoint is intentionally stateless and
 * tenant-safe: it can only create leads for the form in the URL.
 */

const MAX_BODY_BYTES = 100 * 1024; // 100 KB (PRD §62)
const IDEMPOTENCY_TTL_HOURS = 24;

// ── In-memory per-IP rate limiter ───────────────────────────────────
// V1 strategy: fixed 1-minute window, per server instance. Keeps accidental
// loops/bots at bay without external infra (spec allows any V1-compatible
// strategy; a shared store can replace this later without API changes).
const RATE_LIMIT_MAX = 60;
const RATE_WINDOW_MS = 60_000;

// ── Structured error responses (PRD §47, §58) ──────────────────────
type ErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORM_NOT_FOUND'
  | 'FORM_INACTIVE'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INTERNAL_ERROR';

function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  requestId: string,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(
    { success: false, error: { code, message, requestId } },
    { status, headers: { 'x-request-id': requestId, ...(extraHeaders ?? {}) } },
  );
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Calendar-month usage window in UTC (documented V1 rule — data-model §44).
function currentPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ── CORS ─────────────────────────────────────────────────────────────
// Browser-side integrations are allowed (with documented warnings) — the
// form secret, not cookies, is the security boundary here, so permissive
// CORS on this endpoint does not create a credentialed cross-site surface.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
  'Access-Control-Max-Age': '86400',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formPublicId: string }> },
) {
  const requestId = 'req_' + crypto.randomUUID().slice(0, 8);
  const withCors = (res: NextResponse) => {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    res.headers.set('x-request-id', requestId);
    return res;
  };

  try {
    const { formPublicId } = await params;

    // 1. Content type
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return withCors(
        apiError('INVALID_REQUEST', 'Content-Type must be application/json.', 400, requestId),
      );
    }

    // 2. Payload size
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(
        apiError('PAYLOAD_TOO_LARGE', 'Request payload exceeds the allowed size.', 413, requestId),
      );
    }
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return withCors(
        apiError('PAYLOAD_TOO_LARGE', 'Request payload exceeds the allowed size.', 413, requestId),
      );
    }

    // 3. Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return withCors(
        apiError('INVALID_REQUEST', 'Request body is not valid JSON.', 400, requestId),
      );
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return withCors(
        apiError('INVALID_REQUEST', 'The request body must be a JSON object.', 400, requestId),
      );
    }
    const body = parsed as { data?: unknown; metadata?: unknown };

    // 4. Payload structure (flexible JSON — only shape checks, PRD §26)
    if (
      typeof body.data !== 'object' ||
      body.data === null ||
      Array.isArray(body.data) ||
      Object.keys(body.data as object).length === 0
    ) {
      return withCors(
        apiError('INVALID_REQUEST', 'The request body must contain a data object.', 400, requestId),
      );
    }
    if (
      body.metadata !== undefined &&
      (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata))
    ) {
      return withCors(
        apiError('INVALID_REQUEST', 'metadata must be a JSON object when provided.', 400, requestId),
      );
    }

    // 5. Rate limit (IP-based; XFF first hop when behind a proxy)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rate = checkRateLimit(ip, { max: RATE_LIMIT_MAX, windowMs: RATE_WINDOW_MS });
    if (!rate.allowed) {
      return withCors(
        apiError(
          'RATE_LIMITED',
          'Too many requests. Please slow down and retry later.',
          429,
          requestId,
          { 'Retry-After': String(rate.retryAfterSec) },
        ),
      );
    }

    // 6. Resolve form
    const db = serviceClient();
    const { data: form, error: formError } = await db
      .from('forms')
      .select('id, workspace_id, status, secret_hash')
      .eq('public_id', formPublicId)
      .maybeSingle();
    if (formError) throw formError;
    if (!form) {
      return withCors(
        apiError('FORM_NOT_FOUND', 'No form exists for this endpoint.', 404, requestId),
      );
    }

    // 7. Archived forms reject submissions (PRD §38)
    if (form.status !== 'active') {
      return withCors(
        apiError('FORM_INACTIVE', 'This form is archived and no longer accepts submissions.', 409, requestId),
      );
    }

    // 8. Secret verification (constant-time hash comparison)
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.toLowerCase().startsWith('bearer ')
      ? auth.slice(7).trim()
      : '';
    if (!token) {
      return withCors(
        apiError('UNAUTHORIZED', 'Missing Authorization header. Expected: Bearer FORM_SECRET.', 401, requestId),
      );
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (!safeEqual(tokenHash, form.secret_hash)) {
      return withCors(apiError('UNAUTHORIZED', 'Invalid form secret.', 401, requestId));
    }

    // 9. Quota (fast pre-check; atomic enforcement lives in the RPC)
    const { data: subscription } = await db
      .from('subscriptions')
      .select('plan')
      .eq('workspace_id', form.workspace_id)
      .maybeSingle();
    const planId = (subscription?.plan as PlanId) ?? DEFAULT_PLAN;
    const maxLeads = PLANS[planId].monthlyLeads;
    const period = currentPeriod();

    if (maxLeads !== null) {
      const { data: counter } = await db
        .from('usage_counters')
        .select('leads_count')
        .eq('workspace_id', form.workspace_id)
        .eq('period_start', period.start)
        .eq('period_end', period.end)
        .maybeSingle();
      if ((counter?.leads_count ?? 0) >= maxLeads) {
        return withCors(
          apiError('QUOTA_EXCEEDED', 'Monthly lead limit reached.', 402, requestId),
        );
      }
    }

    // 10. Idempotency key (scoped to form inside the RPC)
    const idempotencyHeader = request.headers.get('idempotency-key');
    const idempotencyKey =
      idempotencyHeader && idempotencyHeader.length >= 8 && idempotencyHeader.length <= 255
        ? idempotencyHeader
        : null;
    const requestHash = createHash('sha256').update(rawBody).digest('hex');
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 3600_000).toISOString();

    // 11. Atomic create: idempotency + quota + lead in one transaction.
    // New 9-arg signature (migration 017). Fallback covers pre-017 databases.
    const rpcArgs = {
      p_form_public_id: formPublicId,
      p_request_hash: requestHash,
      p_data: body.data,
      p_metadata: body.metadata ?? null,
      p_idempotency_key: idempotencyKey,
      p_idempotency_expires_at: expiresAt,
      p_usage_period_start: period.start,
      p_usage_period_end: period.end,
      p_max_leads: maxLeads,
    };
    let { data: rpcData, error: rpcError } = await db.rpc(
      'create_lead_with_idempotency',
      rpcArgs,
    );

    // Migration 017 added p_max_leads (9-arg). If the live DB still has the
    // pre-017 8-arg function, PostgREST cannot resolve the 9-named-arg call
    // and reports PGRST202 ("Could not find the function ...") — a raw 42883
    // only surfaces when Postgres itself rejects the signature. Accept either
    // so the legacy fallback actually fires. If the function is genuinely
    // missing, the retry fails too and we fall through to the shared error
    // handling below (fail closed).
    if (
      rpcError &&
      (rpcError.code === 'PGRST202' ||
        rpcError.code === '42883' ||
        /could not find the function|does not exist|not find function/i.test(
          rpcError.message ?? '',
        ))
    ) {
      const { p_max_leads: _drop, ...legacyArgs } = rpcArgs;
      const legacy = await db.rpc('create_lead_with_idempotency', legacyArgs);
      rpcData = legacy.data;
      rpcError = legacy.error;
    }

    if (rpcError) {
      const msg = rpcError.message ?? '';
      if (msg.includes('QUOTA_EXCEEDED')) {
        return withCors(
          apiError('QUOTA_EXCEEDED', 'Monthly lead limit reached.', 402, requestId),
        );
      }
      if (msg.includes('FORM_NOT_FOUND')) {
        return withCors(
          apiError('FORM_NOT_FOUND', 'No form exists for this endpoint.', 404, requestId),
        );
      }
      console.error('[submission_failed]', { requestId, code: rpcError.code });
      return withCors(
        apiError('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500, requestId),
      );
    }

    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!result) {
      console.error('[submission_no_result]', { requestId });
      return withCors(
        apiError('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500, requestId),
      );
    }
    if (result.conflict) {
      return withCors(
        apiError(
          'INVALID_REQUEST',
          'This Idempotency-Key was already used with a different request body.',
          409,
          requestId,
        ),
      );
    }

    console.log('[submission_received]', {
      requestId,
      formPublicId,
      leadId: result.lead_id,
    });

    return withCors(
      NextResponse.json(
        {
          success: true,
          leadId: result.lead_id,
          message: 'Submission received.',
        },
        { status: 200 },
      ),
    );
  } catch (err) {
    console.error('[submission_error]', { requestId, err: String(err) });
    return withCors(
      apiError('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500, requestId),
    );
  }
}
