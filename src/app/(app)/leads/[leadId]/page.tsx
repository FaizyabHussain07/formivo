import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { LeadDetailClient } from './lead-detail';

export const metadata = { title: 'Lead' };

interface LeadWithForm {
  id: string;
  workspace_id: string;
  form_id: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'archived';
  created_at: string;
  updated_at: string;
  forms: {
    id: string;
    name: string;
    public_id: string;
    workspace: { id: string; name: string };
  };
}

export default async function LeadPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  const { workspace } = await requireWorkspace();
  const { leadId } = await params;

  const { data: leadData } = await supabase
    .from('leads')
    .select('id, workspace_id, form_id, data, metadata, status, created_at, updated_at')
    .eq('id', leadId)
    .eq('workspace_id', workspace.id)
    .single();

  if (!leadData) redirect('/leads');

  const { data: formData } = await supabase
    .from('forms')
    .select('id, name, public_id, workspace_id')
    .eq('id', leadData.form_id)
    .single();

  if (!formData) redirect('/leads');

  const lead: LeadWithForm = {
    ...leadData,
    forms: {
      id: formData.id,
      name: formData.name,
      public_id: formData.public_id,
      workspace: { id: formData.workspace_id, name: workspace.name },
    },
  };

  return (
    <>
      <PageHeader title="Lead Details" />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <LeadDetailClient lead={lead} />
      </div>
    </>
  );
}
