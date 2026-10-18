import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { Badge } from '@/components/ui';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { FormDetailPage } from './form-detail';

export const metadata = { title: 'Form' };

export default async function FormPage({
  params,
}: {
  params: Promise<{ formPublicId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect('/sign-in');
  }

  const { workspace } = await requireWorkspace();

  const { formPublicId } = await params;

  const { data: form } = await supabase
    .from('forms')
    .select('id, public_id, name, description, status, created_at, workspace_id')
    .eq('public_id', formPublicId)
    .maybeSingle();

  if (!form || form.workspace_id !== workspace.id) {
    redirect('/forms');
  }

  return (
    <AppShell user={{ id: user.id, email: user.email }} workspaceName={workspace.name}>
      <PageHeader title={form.name} action={<Badge>{form.status}</Badge>} />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <FormDetailPage
          form={{
            id: form.id,
            public_id: form.public_id,
            name: form.name,
            description: form.description,
            status: form.status,
            created_at: form.created_at,
            workspace_id: form.workspace_id,
          }}
        />
      </div>
    </AppShell>
  );
}
