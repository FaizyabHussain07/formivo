import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { AppShell } from '@/components/app-shell';
import { Card, Badge } from '@/components/ui';

export const metadata = { title: 'Analytics' };

export default async function ClientAnalyticsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  // Get client's form access
  const { data: access, error: accessError } = await supabase
    .from('client_form_access')
    .select('id, created_at, forms(id, name, public_id)')
    .eq('user_id', user.id)
    .single();

  if (accessError || !access) redirect('/client');

  const formId = access.forms?.id;
  if (!formId) redirect('/client');

  // Get analytics for this form
  const { data: leads } = await supabase
    .from('leads')
    .select('id, status')
    .eq('form_id', formId);

  const allLeads = leads?.data ?? [];
  const totalLeads = allLeads.length;

  const byStatus: Record<string, number> = {};
  for (const lead of allLeads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
  }

  // This month's leads
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthLeads = allLeads.filter(
    (l) => new Date(l.created_at) >= monthStart,
  ).length;

  const statusOrder = ['new', 'contacted', 'qualified', 'converted', 'archived'];

  return (
    <AppShell
      user={{ id: user.id, email: user.email }}
      workspaceName={form.name}
    >
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold">Analytics</p>
          <Badge>{form.name}</Badge>
        </div>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Total Leads</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{totalLeads}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">{monthLeads}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Forms</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">1</p>
          </Card>
        </div>

        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold tracking-tight">Leads by Status</h2>
          {totalLeads === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No leads yet — analytics will fill in once your form receives submissions.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {statusOrder.map((status) => {
                const count = byStatus[status] ?? 0;
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{status}</span>
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
