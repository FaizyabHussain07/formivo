import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { Card, Badge } from '@/components/ui';

export const metadata = { title: 'Analytics' };

export default async function ClientAnalyticsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  // Step 1: Get all client_form_access rows for this user
  const accessResult = await supabase
    .from('client_form_access')
    .select('id, form_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const accessList = (accessResult.data ?? []) as Array<{ id: string; form_id: string; created_at: string }>;
  const formIds = accessList.map((a) => a.form_id);
  const assignedForms: Array<{ id: string; name: string; public_id: string }> = [];

  // Step 2: Fetch form details for each form
  if (formIds.length > 0) {
    const formsResult = await supabase
      .from('forms')
      .select('id, name, public_id')
      .in('id', formIds);

    const formsList = (formsResult.data ?? []) as Array<{ id: string; name: string; public_id: string }>;

    // Map access to forms, maintaining order
    const formMap = new Map(formsList.map((f) => [f.id, f]));
    for (const a of accessList) {
      const form = formMap.get(a.form_id);
      if (form) {
        assignedForms.push(form);
      }
    }
  }

  // Get lead counts across all assigned forms
  let totalLeads = 0;
  let monthLeads = 0;

  if (formIds.length > 0) {
    const leadsResult = await supabase
      .from('leads')
      .select('id, status, created_at')
      .in('form_id', formIds);

    const leads = (leadsResult.data ?? []) as Array<{ status: string; created_at: string }>;
    totalLeads = leads.length;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    for (const l of leads) {
      if (l.status === 'new' && new Date(l.created_at) >= monthStart) {
        monthLeads++;
      }
    }
  }

  return (
    <>
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <p className="text-lg font-semibold">Analytics</p>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        {assignedForms.length === 0 ? (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">No forms assigned</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Your workspace owner hasn&apos;t assigned any forms to you yet.
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{totalLeads}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">New This Month</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">{monthLeads}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Forms</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{assignedForms.length}</p>
              </Card>
            </div>

            {assignedForms.map((form) => (
              <Card key={form.id} className="mt-4 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">{form.name}</p>
                  <Badge>{form.public_id}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Form analytics will appear here once leads are received.
                </p>
              </Card>
            ))}
          </>
        )}
      </div>
    </>
  );
}
