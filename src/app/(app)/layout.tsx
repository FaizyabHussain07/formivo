import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { AppShell } from '@/components/app-shell';
import type { ReactNode } from 'react';

/**
 * Single shell for every developer route. Pages render page content only —
 * nesting a second shell inside this one was a source of duplicate navigation.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace:workspaces(id, name)')
    .eq('user_id', user.id)
    .maybeSingle();

  const workspace = (membership?.workspace ?? null) as unknown as {
    id: string;
    name: string;
  } | null;
  if (!workspace) redirect('/onboarding');

  return (
    <AppShell user={{ id: user.id, email: user.email }} workspaceName={workspace.name}>
      {children}
    </AppShell>
  );
}