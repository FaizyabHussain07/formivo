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

// PageHeader now lives in the design system; re-exported so existing pages
// keep a single import path while the shells converge on @/components/ui.
export { PageHeader } from '@/components/ui';
