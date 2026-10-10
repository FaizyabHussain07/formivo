import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { Card, LeadStatusBadge } from '@/components/ui';

export const metadata = { title: 'Leads' };

export default async function LeadsPage() {
  const { supabase, user, workspace } = await requireWorkspace();

  const { data: leads } = await supabase
    .from('leads')
    .select('id, form_id, data, status, created_at, forms(name, public_id)')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (leads ?? []) as unknown as Array<{
    id: string;
    data: Record<string, unknown> | null;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'archived';
    created_at: string;
    forms: { name: string; public_id: string } | null;
  }>;

  return (
    <AppShell user={user} workspaceName={workspace.name}>
      <PageHeader title="Leads" />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Card className="p-6">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">No leads yet</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Once your form receives a submission, it will appear here.
              </p>
              <div className="mt-4">
                <Link href="/forms" className="text-sm font-medium text-link hover:underline">
                  Go to Forms →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="block rounded-md border border-border p-4 transition-colors hover:bg-surface-muted"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {String(lead.data?.name ?? 'Lead')}
                        {lead.data?.email ? (
                          <span className="ml-2 font-normal text-muted-foreground">
                            {String(lead.data.email)}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {lead.forms?.name ?? 'Form'} ·{' '}
                        {new Date(lead.created_at).toLocaleString()}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
