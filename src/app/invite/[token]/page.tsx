import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { createHash } from 'crypto';
import { PageHeader } from '@/lib/session';
import { AppShell } from '@/components/app-shell';
import { Card, Button } from '@/components/ui';

export const metadata = { title: 'Accept Invitation' };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { token } = await params;

  // Look up invitation by token hash
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .select('id, workspace_id, form_id, email, status, expires_at, invited_by')
    .eq('token_hash', tokenHash)
    .single();

  if (inviteError || !invitation) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppShell user={{ id: '', email: '' }} workspaceName="">
          <div className="flex flex-1 items-center justify-center px-5">
            <Card className="p-8 text-center max-w-md">
              <h1 className="text-lg font-semibold tracking-tight">Invitation Not Found</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This invitation link is invalid or has been revoked.
              </p>
              <div className="mt-6">
                <Button onClick={() => redirect('/sign-up')}>Create Account</Button>
              </div>
            </Card>
          </div>
        </AppShell>
      </div>
    );
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppShell user={{ id: '', email: '' }} workspaceName="">
          <div className="flex flex-1 items-center justify-center px-5">
            <Card className="p-8 text-center max-w-md">
              <h1 className="text-lg font-semibold tracking-tight">Invitation Expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This invitation expired 7 days after it was sent.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask the workspace owner to send you a new invitation.
              </p>
              <div className="mt-6">
                <Button onClick={() => redirect('/sign-in')}>Sign In</Button>
              </div>
            </Card>
          </div>
        </AppShell>
      </div>
    );
  }

  // Check if already accepted
  if (invitation.status === 'accepted') {
    redirect(`/client/forms/${invitation.form_id}`);
  }

  if (invitation.status === 'revoked') {
    return (
      <div className="flex min-h-screen flex-col">
        <AppShell user={{ id: '', email: '' }} workspaceName="">
          <div className="flex flex-1 items-center justify-center px-5">
            <Card className="p-8 text-center max-w-md">
              <h1 className="text-lg font-semibold tracking-tight">Invitation Revoked</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This invitation is no longer available.
              </p>
              <div className="mt-6">
                <Button variant="secondary" onClick={() => redirect('/sign-in')}>
                  Go to Sign In
                </Button>
              </div>
            </Card>
          </div>
        </AppShell>
      </div>
    );
  }

  // If user is already authenticated, attempt to accept
  if (user) {
    // Check email match
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, id')
      .eq('id', user.id)
      .single();

    const userEmail = profile?.email || user.email;
    if (userEmail?.toLowerCase() !== invitation.email.toLowerCase()) {
      return (
        <div className="flex min-h-screen flex-col">
          <AppShell user={{ id: user.id, email: user.email ?? '' }} workspaceName="">
            <div className="flex flex-1 items-center justify-center px-5">
              <Card className="p-8 text-center max-w-md">
                <h1 className="text-lg font-semibold tracking-tight">Email Mismatch</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This invitation was sent to <strong>{invitation.email}</strong>, but you're signed in with a different email.
                </p>
                <div className="mt-6 flex gap-3">
                  <Button variant="secondary" onClick={() => redirect('/sign-in')}>
                    Sign in with correct email
                  </Button>
                </div>
              </Card>
            </div>
          </AppShell>
        </div>
      );
    }

    // Accept the invitation
    const { error: membershipError } = await supabase
      .from('workspace_memberships')
      .upsert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: 'client',
      });

    if (!membershipError) {
      await supabase
        .from('client_form_access')
        .upsert({
          workspace_id: invitation.workspace_id,
          form_id: invitation.form_id,
          user_id: user.id,
        });


      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
    }

    redirect(`/client/forms/${invitation.form_id}`);
  }

  // Not authenticated — show sign in/up prompt
  return (
    <div className="flex min-h-screen flex-col">
      <AppShell user={{ id: '', email: '' }} workspaceName="">
        <div className="flex flex-1 items-center justify-center px-5">
          <Card className="p-8 text-center max-w-md">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3.196 3.196 0 00-1.171-1.998 6.937 6.937 0 00-6.815 0 3.196 3.196 0 00-1.172 1.998a9.094 9.094 0 003.74 1.479c.035.025.072.05.11.075l.075-.07a6.934 6.934 0 006.815 0c.382-.382.892-.606 1.479-.748a9.094 9.094 0 001.479-3.741zM9.5 16.51A3.18 3.18 0 016 14.82V12a3 3 0 116 0v2.82c-.303.035-.634.074-.966.119a3.18 3.18 0 01-3.18-3.18z" />
              </svg>
            </div>
            <h1 className="mt-4 text-lg font-semibold tracking-tight">Accept Invitation</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in or create an account to accept the invitation to a Formivo form.
            </p>
            <p className="mt-1 text-xs text-subtle-foreground">
              The invitation was sent to {invitation.email}.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={() => redirect('/sign-in')}>Sign In</Button>
              <Button variant="secondary" onClick={() => redirect('/sign-up')}>
                Create Account
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    </div>
  );
}
