#!/usr/bin/env node
// Invitation DB smoke test used by the Formivo dev loop.
//
// This script imports Supabase directly (not through Next.js) so it can be
// run from a standard Node environment. It is intended to be run while
// authenticated in a browser session against the Supabase project, then
// drive the same DB writes the /api/invitations endpoint uses.
//
// Typical usage:
//   cd formivo
//   node scripts/invitation-smoke-test.mjs
//
// It is expected to print TEST_SKIP when run outside an authenticated
// Supabase session, and otherwise create a pending invitation row and print
// the invitation id plus the raw token that would be emailed to the client.
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('TEST_SKIP: missing Supabase env vars');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('TEST_SKIP: not signed in');
    return;
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    console.error('TEST_SKIP: no workspace membership found');
    return;
  }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', membership.workspace_id)
    .single();

  const { data: forms } = await supabase
    .from('forms')
    .select('id, name, public_id, status')
    .eq('workspace_id', membership.workspace_id)
    .limit(1);

  const form = forms?.[0];
  if (!form) {
    console.error('TEST_SKIP: no forms in workspace');
    return;
  }

  const rawToken = 'inv_' + randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      workspace_id: membership.workspace_id,
      form_id: form.id,
      email: 'invited-test-user@example.invalid',
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: user.id,
    })
    .select()
    .single();

  if (inviteError) {
    console.error('INVITE_CREATE_FAILED', { code: inviteError.code, message: inviteError.message });
    return;
  }

  console.log('INVITE_CREATED', {
    invitationId: invitation.id,
    formId: form.id,
    formPublicId: form.public_id,
    formName: form.name,
    workspaceName: ws?.name ?? null,
    email: invitation.email,
    expiresAt: invitation.expires_at,
    rawToken,
  });
}

main().catch((err) => {
  console.error('INVITE_SCRIPT_ERROR', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
