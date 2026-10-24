import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/db/server';
import { ClientShell } from '@/components/client-shell';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  return (
    <ClientShell
      user={{ id: user.id, email: user.email }}
      workspaceName="Client Portal"
    >
      {children}
    </ClientShell>
  );
}
