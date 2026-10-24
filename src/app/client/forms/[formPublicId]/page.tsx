import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { AppShell } from '@/components/app-shell';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';

export const metadata = { title: 'Form' };

export default async function ClientFormPage({
  params,
}: {
  params: Promise<{ formPublicId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  const { formPublicId } = await params;

  // Step 1: Find the form
  const formResult = await supabase
    .from('forms')
    .select('id, name, status, public_id, created_at')
    .eq('public_id', formPublicId)
    .single();

  const formRow = formResult.data as { id: string; name: string; status: string; public_id: string; created_at: string } | null;
  if (!formRow) redirect('/client');

  const formId = formRow.id;

  // Step 2: Check client_form_access
  const accessResult = await supabase
    .from('client_form_access')
    .select('id')
    .eq('user_id', user.id)
    .eq('form_id', formId)
    .single();

  const access = accessResult.data as { id: string } | null;
  if (!access) redirect('/client');

  const formName = formRow.name;
  const formStatus = formRow.status;
  const formPublicIdValue = formRow.public_id;
  const formCreatedAt = formRow.created_at;

  // Get lead counts
  const leadsResult = await supabase
    .from('leads')
    .select('id, status, created_at')
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .limit(5);

  const allLeadsResult = await supabase
    .from('leads')
    .select('id, status')
    .eq('form_id', formId);

  const leadList = (allLeadsResult.data ?? []) as Array<{ status: string }>;
  const totalLeads = leadList.length;
  const newLeads = leadList.filter((l) => l.status === 'new').length;

  const leadsDataArr = (leadsResult.data ?? []) as Array<{ id: string; status: string; created_at: string }>;
  const recentLeads = leadsDataArr.map((l) => ({
    id: l.id,
    status: l.status,
    created_at: l.created_at,
  }));

  return (
    <AppShell user={{ id: user.id, email: user.email }} workspaceName={formName}>
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold">{formName}</p>
          <Badge>{formStatus}</Badge>
        </div>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{totalLeads}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">New Leads</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">{newLeads}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="mt-1 flex items-center gap-2">
                  <Badge>{formStatus}</Badge>
                </p>
              </Card>
            </div>

            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Recent Leads</h2>
              {recentLeads.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No leads yet. Once your form receives a submission, it will appear here.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {recentLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/client/forms/${formPublicIdValue}/leads/${lead.id}`}
                      className="block rounded-md border border-border p-3 transition-colors hover:bg-surface-muted"
                    >
                      <p className="text-sm font-medium">Lead</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Link
                  href={`/client/forms/${formPublicIdValue}/leads`}
                  className="text-sm text-link hover:underline"
                >
                  View all leads →
                </Link>
              </div>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-1">
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Form Details</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Form ID</span>
                  <span className="font-mono text-xs">{formPublicIdValue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(formCreatedAt).toLocaleDateString()}
                  </span>
                </div>
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold">About This Dashboard</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This dashboard shows leads from the assigned form. You can view leads and basic analytics,
                but you cannot modify form settings or access technical configuration.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
