import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { FormStatusBadge } from '@/components/ui';
import { requireWorkspace } from '@/lib/session';
import type { LeadRow } from '@/types';
import { FormDetail } from './form-detail';

export const metadata = { title: 'Form' };

function leadPreview(lead: LeadRow): string {
  const data = lead.data ?? {};
  const name = String(data.name ?? data.full_name ?? data.email ?? 'Submission');
  const email = data.email ? String(data.email) : '';
  return email ? `${name} · ${email}` : name;
}

export default async function FormPage({
  params,
}: {
  params: Promise<{ formPublicId: string }>;
}) {
  const { supabase, workspace } = await requireWorkspace();
  const { formPublicId } = await params;

  const { data: form } = await supabase
    .from('forms')
    .select('id, public_id, name, description, status, created_at, workspace_id')
    .eq('public_id', formPublicId)
    .maybeSingle();

  // Not found, or not in this workspace → back to the list (never leak existence).
  if (!form || form.workspace_id !== workspace.id) redirect('/forms');

  const [countRes, recentRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', form.id),
    supabase
      .from('leads')
      .select('id, data, created_at')
      .eq('form_id', form.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const recentLeads = ((recentRes.data ?? []) as LeadRow[]).map((lead) => ({
    id: lead.id,
    created_at: lead.created_at,
    preview: leadPreview(lead),
  }));

  return (
    <>
      <div className="border-b border-border bg-background">
        <div className="px-5 py-4 lg:px-8">
          <Link
            href="/forms"
            className="mb-2 inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
            All forms
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {form.name}
              </h1>
              {form.description && (
                <p className="mt-0.5 max-w-2xl truncate text-[13px] text-muted-foreground">
                  {form.description}
                </p>
              )}
            </div>
            <FormStatusBadge status={form.status} />
          </div>
        </div>
      </div>

      <FormDetail
        form={{
          id: form.id,
          public_id: form.public_id,
          name: form.name,
          description: form.description,
          status: form.status,
          created_at: form.created_at,
          leadCount: countRes.count ?? 0,
          recentLeads,
        }}
      />
    </>
  );
}