import { AppShell } from '@/components/app-shell';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { Card, Badge } from '@/components/ui';
import { LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from '@/lib/leads';

export const metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const { supabase, user, workspace } = await requireWorkspace();

  const { count: totalLeads } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id);

  const { data: statusRows } = await supabase
    .from('leads')
    .select('status')
    .eq('workspace_id', workspace.id)
    .limit(10000);

  const byStatus: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    archived: 0,
  };
  for (const row of statusRows ?? []) {
    const s = row.status as LeadStatus;
    if (s in byStatus) byStatus[s] += 1;
  }

  const { count: formCount } = await supabase
    .from('forms')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id);

  const stats = [
    { label: 'Total leads', value: totalLeads ?? 0 },
    { label: 'Forms', value: formCount ?? 0 },
    {
      label: 'This month',
      value: await (async () => {
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id)
          .gte('created_at', start.toISOString());
        return count ?? 0;
      })(),
    },
  ];

  const total = totalLeads ?? 0;

  return (
    <AppShell user={user} workspaceName={workspace.name}>
      <PageHeader title="Analytics" />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold">Leads by Status</h2>
          {total === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No leads yet — analytics will fill in once your form receives
              submissions.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {LEAD_STATUSES.map((status) => {
                const count = byStatus[status];
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Badge>{LEAD_STATUS_LABELS[status]}</Badge>
                      </span>
                      <span className="font-medium">
                        {count} <span className="font-normal text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
