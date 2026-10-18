import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/db/server';
import { AppShell } from '@/components/app-shell';
import { Button, Card, Badge } from '@/components/ui';

export const metadata = { title: 'Forms' };

interface FormRow {
  id: string;
  public_id: string;
  name: string;
  status: string;
  created_at: string;
}

export default async function FormsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect('/sign-in');
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('*, workspace:workspaces(*)')
    .eq('user_id', user.id)
    .maybeSingle();

  const ws = membership?.workspace ?? null;

  if (!ws) {
    redirect('/onboarding');
  }

  const { data: forms } = await supabase
    .from('forms')
    .select('id, public_id, name, status, created_at')
    .eq('workspace_id', ws.id)
    .order('created_at', { ascending: false });

  // Fetch lead counts per form
  const { data: allLeads } = await supabase
    .from('leads')
    .select('form_id')
    .eq('workspace_id', ws.id);

  const leadCounts: Record<string, number> = {};
  if (allLeads) {
    for (const lead of allLeads) {
      leadCounts[lead.form_id] = (leadCounts[lead.form_id] ?? 0) + 1;
    }
  }

  const rows = (forms ?? []) as FormRow[];

  return (
    <AppShell user={{ id: user.id, email: user.email }} workspaceName={ws.name}>
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold">Forms</p>
          <Link href="/forms/new">
            <Button size="sm">Create Form</Button>
          </Link>
        </div>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Card className="p-6">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">Connect your first form</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Send submissions from an existing website form to Formivo and
                start managing your leads.
              </p>
              <div className="mt-4">
                <Link href="/forms/new">
                  <Button>Create Form</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((form) => (
                <Link
                  key={form.id}
                  href={`/forms/${form.public_id}`}
                  className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-surface-muted"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{form.name}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Created {new Date(form.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-subtle-foreground">
                        {leadCounts[form.id] ?? 0} lead{(leadCounts[form.id] ?? 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <Badge>{form.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
