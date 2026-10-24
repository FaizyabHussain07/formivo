import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { Card, Badge } from '@/components/ui';
import Link from 'next/link';

export const metadata = { title: 'Client Dashboard' };

export default async function ClientPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  // Step 1: Get all client_form_access rows for this user
  const accessResult = await supabase
    .from('client_form_access')
    .select('id, form_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const accessList = (accessResult.data ?? []) as Array<{ id: string; form_id: string }>;
  const formIds = accessList.map((a) => a.form_id);
  const assignedForms: Array<{
    id: string;
    name: string;
    public_id: string;
    status: string;
    created_at: string;
  }> = [];

  // Step 2: Fetch form details for each form
  if (formIds.length > 0) {
    const formsResult = await supabase
      .from('forms')
      .select('id, name, public_id, status, created_at')
      .in('id', formIds);

    const formsList = (formsResult.data ?? []) as Array<{
      id: string;
      name: string;
      public_id: string;
      status: string;
      created_at: string;
    }>;

    // Map access to forms, maintaining order by created_at desc
    const formMap = new Map(formsList.map((f) => [f.id, f]));
    const formOrder = new Map(accessList.map((a, i) => [a.form_id, i]));
    formsList.sort((a, b) => {
      const ia = formOrder.get(a.id) ?? 0;
      const ib = formOrder.get(b.id) ?? 0;
      return ia - ib;
    });
    for (const f of formsList) {
      assignedForms.push(f);
    }
  }

  // Get lead counts across all assigned forms
  let totalLeads = 0;
  let newLeads = 0;

  if (formIds.length > 0) {
    const leadsResult = await supabase
      .from('leads')
      .select('id, status')
      .in('form_id', formIds);

    const leadList = (leadsResult.data ?? []) as Array<{ status: string }>;
    totalLeads = leadList.length;
    newLeads = leadList.filter((l) => l.status === 'new').length;
  }

  return (
    <>
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <p className="text-lg font-semibold">Client Dashboard</p>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        {assignedForms.length === 0 ? (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">No forms assigned</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Your workspace owner hasn&apos;t assigned any forms to you yet.
                Check your email for an invitation or contact your workspace owner.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
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

            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Your Forms</h2>
              <div className="mt-4 space-y-2">
                {assignedForms.map((form) => (
                  <Link
                    key={form.id}
                    href={`/client/forms/${form.public_id}`}
                    className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-surface-muted"
                  >
                    <div>
                      <p className="font-medium">{form.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Assigned {new Date(form.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge>{form.status}</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
