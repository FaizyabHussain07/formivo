import Link from 'next/link';
import { createHash } from 'crypto';
import { createServerSupabaseClient } from '@/lib/db/server';
import { Badge, Button, Card } from '@/components/ui';
import { Logo } from '@/components/logo';
import { AcceptInvitationButton } from './accept-button';

export const metadata = { title: 'Accept Invitation' };

type PreviewRow = {
  form_id: string;
  workspace_id: string;
  invited_email: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  form_name: string;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <Link href="/" aria-label="Formivo home">
            <Logo className="h-7 w-auto" />
          </Link>
          <Badge>Client Invitation</Badge>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-8 text-center">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="mt-2 text-sm text-muted-foreground">{body}</div>
      {action && <div className="mt-6 flex flex-col gap-3">{action}</div>}
    </Card>
  );
}

export default async function InvitationAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Shell>
        <Notice
          title="Invitation link incomplete"
          body={
            <>
              This link is missing its invitation token. Open the link exactly as
              it appears in your email, or ask the form owner to send a new
              invitation.
            </>
          }
          action={
            <Link href="/">
              <Button variant="secondary" className="w-full">
                Back to home
              </Button>
            </Link>
          }
        />
      </Shell>
    );
  }

  const supabase = await createServerSupabaseClient();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  // Server-side verification only — nothing sensitive is shown before this resolves.
  const { data, error: lookupError } = await supabase.rpc('get_invitation_by_token', {
    p_token_hash: tokenHash,
  });

  const invitation = (Array.isArray(data) ? data[0] : data) as PreviewRow | null;

  if (lookupError || !invitation) {
    return (
      <Shell>
        <Notice
          title="Invitation not found"
          body={
            <>
              This invitation link is invalid, has been revoked, or has already
              been used. Ask the form owner to send you a new invitation.
            </>
          }
          action={
            <Link href="/sign-in">
              <Button variant="secondary" className="w-full">
                Go to sign in
              </Button>
            </Link>
          }
        />
      </Shell>
    );
  }

  const nextPath = `/invitations/accept?token=${encodeURIComponent(token)}`;
  const nextQuery = `?next=${encodeURIComponent(nextPath)}`;
  const expired =
    invitation.status === 'expired' || new Date(invitation.expires_at) < new Date();

  if (invitation.status === 'revoked') {
    return (
      <Shell>
        <Notice
          title="Invitation revoked"
          body={
            <>
              This invitation is no longer available. Contact the form owner if
              you still need access to <strong>{invitation.form_name}</strong>.
            </>
          }
        />
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell>
        <Notice
          title="Invitation expired"
          body={
            <>
              This invitation to <strong>{invitation.form_name}</strong> has
              expired. Ask the form owner to send a new one.
            </>
          }
        />
      </Shell>
    );
  }

  if (invitation.status === 'accepted') {
    return (
      <Shell>
        <Notice
          title="Invitation already accepted"
          body={
            <>
              Access to <strong>{invitation.form_name}</strong> has already been
              granted. Sign in with {invitation.invited_email} to open the client
              portal.
            </>
          }
          action={
            <Link href={`/sign-in${nextQuery}`}>
              <Button className="w-full">Sign in to open the portal</Button>
            </Link>
          }
        />
      </Shell>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 8.72a9.094 9.094 0 00-3.741-.479 3.196 3.196 0 00-1.171-1.998 6.937 6.937 0 00-6.815 0 3.196 3.196 0 00-1.172 1.998 9.094 9.094 0 00-3.74 1.479c.035.025.072.05.11.075l.075-.07a6.934 6.934 0 006.815 0c.382-.382.892-.606 1.479-.748a9.094 9.094 0 001.479-3.741zM9.5 16.51A3.18 3.18 0 016 14.82V12a3 3 0 116 0v2.82c-.303.035-.634.074-.966.119a3.18 3.18 0 01-3.18-3.18z" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight">
            You&apos;re invited
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ve been invited to view submissions for{' '}
            <strong>{invitation.form_name}</strong>.
          </p>
          <p className="mt-1 text-xs text-subtle-foreground">
            Invitation intended for {invitation.invited_email}.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href={`/sign-in${nextQuery}`}>
              <Button className="w-full">Sign in</Button>
            </Link>
            <Link href={`/sign-up${nextQuery}`}>
              <Button variant="secondary" className="w-full">
                Create account
              </Button>
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  const userEmail = user.email?.toLowerCase() ?? '';
  if (userEmail !== invitation.invited_email.toLowerCase()) {
    return (
      <Shell>
        <Notice
          title="Signed in with the wrong email"
          body={
            <>
              This invitation was sent to{' '}
              <strong>{invitation.invited_email}</strong>, but you&apos;re signed
              in as <strong>{user.email}</strong>. Sign out and sign in with the
              invited address to continue.
            </>
          }
          action={
            <Link href={`/sign-in${nextQuery}`}>
              <Button className="w-full">Sign in with the invited email</Button>
            </Link>
          }
        />
      </Shell>
    );
  }

  if (!user.email_confirmed_at) {
    return (
      <Shell>
        <Notice
          title="Confirm your email"
          body={
            <>
              Confirm <strong>{user.email}</strong> before accepting this
              invitation. We sent a confirmation link when you created your
              account.
            </>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <Card className="p-8">
        <h1 className="text-lg font-semibold tracking-tight">Accept invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accept to get read-only access to submissions for{' '}
          <strong>{invitation.form_name}</strong>. You won&apos;t be able to edit
          forms, billing, or workspace settings.
        </p>
        <dl className="mt-4 space-y-2 rounded-md border border-border bg-surface-muted/50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Invited email</dt>
            <dd className="truncate font-medium">{invitation.invited_email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Expires</dt>
            <dd className="font-medium">
              {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
        </dl>
        <div className="mt-6">
          <AcceptInvitationButton token={token} />
        </div>
      </Card>
    </Shell>
  );
}