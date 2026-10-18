import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { AppShell } from '@/components/app-shell';
import { Card, Badge, Button, Link } from '@/components/ui';

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

  // Verify form access
  const { data: access } = await supabase
    .from('client_form_access')
    .select('id, forms(id, name, public_id, status, created_at), workspace:workspaces(*)')
    .eq('user_id', user.id)
    .eq('forms.public_id', formPublicId)
    .single();

  if (!access) {
    redirect('/client');
  }

  const form = access.forms;
  if (!form) redirect('/client');

  // Get lead counts
  const { data: leads } = await supabase
    .from('leads')
    .select('id, status, created_at')
    .eq('form_id', form.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const allLeads = await supabase
    .from('leads')
    .select('id, status')
    .eq('form_id', form.id);

  const totalLeads = allLeads.data?.length ?? 0;
  const newLeads = allLeads.data?.filter((l) => l.status === 'new').length ?? 0;

  const recentLeads = (leads?.data ?? []) as Array<{
    id: string;
    status: string;
    created_at: string;
  }>;

  return (
    <AppShell
      user={{ id: user.id, email: user.email }}
      workspaceName={form.name}
    >
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold">{form.name}</p>
          <Badge>{form.status}</Badge>
        </div>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Stats */}
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
                  <Badge>{form.status}</Badge>
                </p>
              </Card>
            </div>

            {/* Recent leads */}
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
                      href={`/client/forms/${formPublicId}/leads/${lead.id}`}
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
                <Link href={`/client/forms/${formPublicId}/leads`} className="text-sm text-link hover:underline">
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
                  <span className="font-mono text-xs">{form.public_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(form.created_at).toLocaleDateString()}
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
