import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { createServerSupabaseClient } from '@/lib/db/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { sendInvitationEmail } from '@/lib/email';
import { invitationTtlMs, PRODUCTION_URL } from '@/lib/app-config';

/** Owner-scoped lookup shared by resend/revoke. */
async function requireOwnedInvitation(invitationId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, message: 'You must be signed in.' };

  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) {
    return { status: 400 as const, message: 'Invalid invitation id.' };
  }

  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, workspace_id, form_id, email, status, expires_at')
    .eq('id', invitationId)
    .maybeSingle();

  if (!invitation) return { status: 404 as const, message: 'Invitation not found.' };

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', invitation.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    return { status: 403 as const, message: 'Only workspace owners can manage invitations.' };
  }

  return { supabase, user, invitation };
}

/**
 * Resend a pending invitation: a fresh single-use token replaces the old one
 * (the previous link stops working) and the email is sent again.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const { invitationId } = await params;
  const owner = await requireOwnedInvitation(invitationId);
  if ('status' in owner) {
    return NextResponse.json(
      { error: { code: owner.status === 401 ? 'UNAUTHORIZED' : owner.status === 403 ? 'FORBIDDEN' : owner.status === 404 ? 'NOT_FOUND' : 'INVALID_REQUEST', message: owner.message } },
      { status: owner.status },
    );
  }

  const { supabase, user, invitation } = owner;

  if (invitation.status !== 'pending') {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'Only pending invitations can be resent.' } },
      { status: 409 },
    );
  }

  const ip = clientIp(request.headers);
  const limit = checkRateLimit(`invite-resend:${user.id}:${ip}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many resend attempts. Try again later.' } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const rawToken = 'inv_' + randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + invitationTtlMs()).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('invitations')
    .update({ token_hash: tokenHash, expires_at: expiresAt })
    .eq('id', invitation.id)
    .eq('status', 'pending')
    .select('id, expires_at')
    .maybeSingle();

  if (updateError || !updated) {
    console.error('[invitation_resend_update_failed]', { invitationId: invitation.id, code: updateError?.code });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not resend the invitation.' } },
      { status: 500 },
    );
  }

  // Never put localhost into a real email — fall back to production.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || PRODUCTION_URL;
  // Resend links use the same public accept path as the create flow.
  const invitationUrl = `${PRODUCTION_URL}/invite/${rawToken}`;

  const { data: form } = await supabase
    .from('forms')
    .select('name')
    .eq('id', invitation.form_id)
    .maybeSingle();

  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', invitation.workspace_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const inviterName =
    typeof profile?.full_name === 'string' && profile.full_name.trim().length > 0
      ? profile.full_name.trim()
      : user.email?.split('@')[0] || 'A Formivo user';

  const emailResult = await sendInvitationEmail({
    recipientEmail: invitation.email,
    inviterName,
    workspaceName: ws?.name ?? 'Formivo',
    formName: form?.name ?? 'a Formivo form',
    invitationUrl,
    expiresAt: new Date(updated.expires_at),
    resendApiKey: process.env.RESEND_API_KEY ?? null,
    fromEmail: process.env.RESEND_FROM_EMAIL ?? null,
  });

  if (!emailResult.success) {
    console.error('[invitation_resend_failed]', { invitationId: invitation.id, code: emailResult.code });
    // The token was rotated, so any older link is dead. Hand the fresh link
    // back to the authenticated owner (never logged) for manual sharing.
    const notConfigured = emailResult.code === 'EMAIL_CONFIGURATION_ERROR';
    return NextResponse.json(
      {
        error: {
          code: 'INVITATION_SEND_FAILED',
          message: notConfigured
            ? 'Email delivery is not configured on this deployment. Copy the new invitation link below and send it to your client yourself.'
            : 'The email could not be delivered. Copy the new invitation link below and send it to your client yourself, or retry later.',
          details: { inviteUrl: invitationUrl },
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    invitation: { id: updated.id, email: invitation.email, expiresAt: updated.expires_at },
  });
}

/** Revoke a pending invitation: the link stops working immediately. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const { invitationId } = await params;
  const owner = await requireOwnedInvitation(invitationId);
  if ('status' in owner) {
    return NextResponse.json(
      { error: { code: owner.status === 401 ? 'UNAUTHORIZED' : owner.status === 403 ? 'FORBIDDEN' : owner.status === 404 ? 'NOT_FOUND' : 'INVALID_REQUEST', message: owner.message } },
      { status: owner.status },
    );
  }

  const { supabase, invitation } = owner;

  if (invitation.status !== 'pending') {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'Only pending invitations can be revoked.' } },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', invitation.id)
    .eq('status', 'pending');

  if (error) {
    console.error('[invitation_revoke_failed]', { invitationId: invitation.id, code: error.code });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not revoke the invitation.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}