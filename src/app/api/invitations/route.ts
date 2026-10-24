import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/server';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { sendInvitationEmail } from '@/lib/email';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { invitationTtlMs, PRODUCTION_URL } from '@/lib/app-config';

const createInvitationSchema = z.object({
  formPublicId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } },
      { status: 401 },
    );
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Only workspace owners can invite clients.' } },
      { status: 403 },
    );
  }

  // Cap outbound invitation email per owner to prevent abuse.
  const limit = checkRateLimit(`invite-create:${user.id}:${clientIp(request.headers)}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many invitations sent. Try again later.' } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
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

  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid request. Provide formPublicId and email.' } },
      { status: 400 },
    );
  }

  const { formPublicId, email } = parsed.data;

  const { data: form } = await supabase
    .from('forms')
    .select('id, workspace_id, name')
    .eq('public_id', formPublicId)
    .single();

  if (!form) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Form not found.' } },
      { status: 404 },
    );
  }

  if (form.workspace_id !== membership.workspace_id) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'That form belongs to a different workspace.' } },
      { status: 403 },
    );
  }

  // Check for an existing pending invitation to the same email + form.
  // The old client_access check was looking up by the signed-in owner's id,
  // which cannot detect an invitation for a different recipient email.
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id, status')
    .eq('workspace_id', form.workspace_id)
    .eq('form_id', form.id)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (existingInvitation) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'An invitation to this email and form is already pending. Resend it from the form’s client-sharing settings.' } },
      { status: 409 },
    );
  }

  const rawToken = 'inv_' + randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + invitationTtlMs()).toISOString();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'User profile not found.' } },
      { status: 500 },
    );
  }

  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      workspace_id: form.workspace_id,
      form_id: form.id,
      email: email.toLowerCase(),
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: profile.id,
    })
    .select()
    .single();

  if (inviteError) {
    console.error('[invitation_create_failed]', { formPublicId, email, code: inviteError.code });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not create invitation.' } },
      { status: 500 },
    );
  }

  // Real emails must never carry localhost links: fall back to the
  // production domain, not the dev server.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || PRODUCTION_URL;
  const inviteUrl = `${appUrl}/invitations/accept?token=${encodeURIComponent(rawToken)}`;

  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', form.workspace_id)
    .single();

  // Use the profile's full name when available, otherwise fall back to the
  // email local part so the invitation email still feels personal.
  const inviterName =
    typeof profile.full_name === 'string' && profile.full_name.trim().length > 0
      ? profile.full_name.trim()
      : typeof user.email === 'string'
        ? user.email.split('@')[0] || 'A Formivo user'
        : 'A Formivo user';

  const emailResult = await sendInvitationEmail({
    recipientEmail: email.toLowerCase(),
    inviterName,
    workspaceName: ws?.name ?? 'Formivo',
    formName: form.name,
    invitationUrl: inviteUrl,
    expiresAt: new Date(invitation.expires_at),
    resendApiKey: process.env.RESEND_API_KEY ?? null,
    fromEmail: process.env.RESEND_FROM_EMAIL ?? null,
  });

  if (!emailResult.success) {
    console.error('[invitation_send_failed]', {
      invitationId: invitation.id,
      email: email.toLowerCase(),
      code: emailResult.code,
      message: emailResult.message,
    });

    // The invitation row exists but no one knows its link. Return the raw URL
    // to the authenticated owner ONLY (never logged) so they can share it
    // manually — acceptance still requires the invited email to sign in.
    const notConfigured = emailResult.code === 'EMAIL_CONFIGURATION_ERROR';
    return NextResponse.json(
      {
        error: {
          code: 'INVITATION_SEND_FAILED',
          message: notConfigured
            ? 'Email delivery is not configured on this deployment. Copy the invitation link below and send it to your client yourself.'
            : 'The invitation was created but the email could not be delivered. Copy the invitation link below and send it to your client yourself, or retry later.',
          details: { recipient: email.toLowerCase(), inviteUrl },
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        formId: invitation.form_id,
        formName: form.name,
        status: invitation.status,
        expiresAt: invitation.expires_at,
      },
      email: { sent: true, providerMessageId: emailResult.providerMessageId },
    },
    { status: 201 },
  );
}
