import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';

/**
 * Shared guard for authenticated app pages: resolves the user and their
 * workspace in one place. Redirects to /sign-in when unauthenticated and
 * to /onboarding when no workspace exists yet.
 */
export async function requireWorkspace() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect('/sign-in');
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('*, workspace:workspaces(*)')
    .eq('user_id', user.id)
    .maybeSingle();

  const ws = membership?.workspace ?? null;
  if (!ws) {
    redirect('/onboarding');
  }

  return {
    supabase,
    user: { id: user.id, email: user.email },
    workspace: ws as { id: string; name: string },
  };
}

/** Standard authenticated page header used inside AppShell. */
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold">{title}</p>
        {action}
      </div>
    </div>
  );
}
