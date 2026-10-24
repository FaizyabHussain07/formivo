import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerSupabaseClient } from '@/lib/db/server';
import { PRODUCTION_URL } from '@/lib/app-config';

/**
 * Accept an invitation.
 *
 * Authorization lives in the `accept_invitation` SQL function (migration 018):
 * it derives the user from the session, re-checks status/expiry/email match and
 * creates the membership + form access rows atomically. This handler only
 * authenticates, normalizes input and maps the function's outcome to a response.
 */

/**
 * Blazingly trimmed: avoid JSX-like interpolation in raw route code.
 * Use production URL unless a live app URL env is explicitly set.
 */
function publicBaseUrl() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (typeof env === 'string' && env.length > 0) {
    return env.replace(/\/$/, '');
  }
  return PRODUCTION_URL;
}

const ERROR_MAP: Record<string, { code: string; status: number; message: string }> = {
  invitation_not_found: { code: 'NOT_FOUND', status: 404, message: 'This invitation could not be found.' },
  invitation_revoked: { code: 'FORBIDDEN', status: 403, message: 'This invitation has been revoked.' },
  invitation_expired: { code: 'FORBIDDEN', status: 403, message: 'This invitation has expired.' },
  invitation_already_accepted: { code: 'CONFLICT', status: 409, message: 'This invitation has already been accepted.' },
  email_mismatch: { code: 'FORBIDDEN', status: 403, message: 'This invitation was sent to a different email address.' },
  email_unverified: { code: 'FORBIDDEN', status: 403, message: 'Confirm your email address before accepting this invitation.' },
  not_authenticated: { code: 'UNAUTHORIZED', status: 401, message: 'You must be signed in to accept an invitation.' },
};


const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || PRODUCTION_URL;

/** Postgres raises these exact words; anything else is an internal failure. */
function mapError(message: string) {
  for (const key of Object.keys(ERROR_MAP)) {
    if (message.includes(key)) return ERROR_MAP[key];
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to accept an invitation.' } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid JSON.' } },
      { status: 400 },
    );
  }

  const token = typeof body === 'object' && body !== null && 'token' in body
    ? String(body.token)
    : null;

  if (!token || token.length > 512) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invitation token is required.' } },
      { status: 400 },
    );
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data, error } = await supabase.rpc('accept_invitation', {
    p_token_hash: tokenHash,
  });

  if (error) {
    const mapped = mapError(error.message);
    if (mapped) {
      return NextResponse.json(
        { error: { code: mapped.code, message: mapped.message } },
        { status: mapped.status },
      );
    }
    // Never echo raw database errors to the client.
    console.error('[invitation_accept_failed]', { code: error.code });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'The invitation could not be accepted. Please try again.' } },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  const formId = row && typeof row === 'object' ? (row as { form_id?: string }).form_id : null;
  if (!formId) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'The invitation could not be accepted. Please try again.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Invitation accepted.',
    redirectUrl: `${PRODUCTION_URL}/client/forms/${formId}`,
  });
}