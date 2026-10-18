import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/server';
import { createHash } from 'crypto';

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

  if (!token) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invitation token is required.' } },
      { status: 400 },
    );
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .select('id, workspace_id, form_id, email, status, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .single();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'This invitation could not be found.' } },
      { status: 404 },
    );
  }

  if (invitation.status !== 'pending') {
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'This invitation has already been accepted.' } },
        { status: 409 },
      );
    }
    if (invitation.status === 'revoked') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'This invitation has been revoked.' } },
        { status: 403 },
      );
    }
    if (invitation.status === 'expired') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'This invitation has expired.' } },
        { status: 403 },
      );
    }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'This invitation has expired.' } },
      { status: 403 },
    );
  }

  // Check email match
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'This invitation was sent to a different email address.' } },
      { status: 403 },
    );
  }

  // Create workspace membership if needed
  const { data: existingMembership } = await supabase
    .from('workspace_memberships')
    .select('id')
    .eq('workspace_id', invitation.workspace_id)
    .eq('user_id', user.id)
    .single();

  if (!existingMembership) {
    const { error: membershipError } = await supabase
      .from('workspace_memberships')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: 'client',
      });

    if (membershipError) {
      console.error('[membership_create_failed]', { code: membershipError.code });
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Could not create workspace access.' } },
        { status: 500 },
      );
    }
  }

  // Create form-level access
  const { error: accessError } = await supabase
    .from('client_form_access')
    .upsert({
      workspace_id: invitation.workspace_id,
      form_id: invitation.form_id,
      user_id: user.id,
    });


  if (accessError) {
    console.error('[form_access_create_failed]', { code: accessError.code });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not create form access.' } },
      { status: 500 },
    );
  }

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  return NextResponse.json({
    success: true,
    message: 'Invitation accepted.',
    workspaceId: invitation.workspace_id,
    formId: invitation.form_id,
    redirectUrl: `${appUrl}/client/forms/${invitation.form_id}`,
  });
}
