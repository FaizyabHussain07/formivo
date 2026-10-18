import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { AppShell } from '@/components/app-shell';
import { Card, Badge } from '@/components/ui';

export const metadata = { title: 'Client Dashboard' };

export default async function ClientPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  // Get client's form access
  const { data: access } = await supabase
    .from('client_form_access')
    .select('id, created_at, forms(id, name, public_id, status, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const forms = (access ?? []) as Array<{
    id: string;
    created_at: string;
    forms: {
      id: string;
      name: string;
      public_id: string;
      status: string;
      created_at: string;
    } | null;
  }>;

  const assignedForms = forms.filter((f) => f.forms).map((f) => f.forms!);

  // Get total lead counts for each assigned form
  const formIds = assignedForms.map((f) => f.id);
  let totalLeads = 0;
  let newLeads = 0;

  if (formIds.length > 0) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, status')
      .in('form_id', formIds);

    if (leads) {
      totalLeads = leads.length;
      newLeads = leads.filter((l) => l.status === 'new').length;
    }
  }

  return (
    <AppShell
      user={{ id: user.id, email: user.email }}
      workspaceName={`Client Portal`}
    >
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <p className="text-lg font-semibold">Client Dashboard</p>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        {assignedForms.length === 0 ? (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">No forms assigned</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Your workspace owner hasn't assigned any forms to you yet.
                Check your email for an invitation or contact your workspace owner.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
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
                <p className="text-sm text-muted-foreground">Forms</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{assignedForms.length}</p>
              </Card>
            </div>

            {/* Assigned forms */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Your Forms</h2>
              <div className="mt-4 space-y-2">
                {assignedForms.map((form) => (
                  <a
                    key={form.id}
                    href={`/client/forms/${form.public_id}`}
                    className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-surface-muted"
                  >
                    <div>
                      <p className="font-medium">{form.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Assigned {new Date(access.find((a) => a.forms?.id === form.id)?.created_at ?? Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge>{form.status}</Badge>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
