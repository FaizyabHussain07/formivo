import Link from 'next/link';
import { FileText, Inbox, Plus, Users } from 'lucide-react';
import { requireWorkspace } from '@/lib/session';
import { Button, Card, EmptyState, FormStatusBadge, PageHeader } from '@/components/ui';
import type { FormRow, LeadRow } from '@/types';

export const metadata = { title: 'Overview' };

function leadPreview(lead: LeadRow): string {
  const data = lead.data ?? {};
  const name = String(data.name ?? data.full_name ?? data.email ?? 'Lead');
  const email = data.email ? String(data.email) : '';
  return email ? `${name} · ${email}` : name;
}

export default async function DashboardPage() {
  const { supabase, workspace } = await requireWorkspace();

  const [formsRes, leadsRes, clientRes, monthRes] = await Promise.all([
    supabase
      .from('forms')
      .select('id, public_id, name, status, created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('leads')
      .select('id, data, status, created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('client_form_access')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const forms = (formsRes.data ?? []) as FormRow[];
  const leads = (leadsRes.data ?? []) as LeadRow[];
  const formCount = (await supabase
    .from('forms')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)).count ?? 0;
  const leadCount = (await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)).count ?? 0;

  const isEmpty = formCount === 0 && leadCount === 0;

  return (
    <>
      <PageHeader
        title={workspace.name}
        description="Everything your forms have captured, at a glance."
        actions={
          <>
            <Link href="/clients">
              <Button variant="secondary">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Invite client
              </Button>
            </Link>
            <Link href="/forms/new">
              <Button>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Create form
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-6 px-5 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Forms', value: formCount },
            { label: 'Total leads', value: leadCount },
            { label: 'New this month', value: monthRes.count ?? 0 },
            { label: 'Client viewers', value: clientRes.count ?? 0 },
          ].map((stat) => (
            <Card key={stat.label} className="p-5">
              <p className="text-[13px] text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {stat.value}
              </p>
            </Card>
          ))}
        </div>

        {isEmpty ? (
          <Card>
            <EmptyState
              icon={<FileText className="h-6 w-6" aria-hidden="true" />}
              title="Create your first form connection"
              description="Name a form, copy its endpoint, and point the form you already built at it. Submissions appear here as leads."
              action={
                <Link href="/forms/new">
                  <Button>Create form</Button>
                </Link>
              }
              secondaryAction={
                <Link href="/docs">
                  <Button variant="secondary">Read the docs</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">Recent forms</h2>
                <Link href="/forms" className="text-[13px] text-primary hover:text-primary-hover">
                  All forms →
                </Link>
              </div>
              {forms.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                  No forms yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {forms.map((form) => (
                    <li key={form.id}>
                      <Link
                        href={`/forms/${form.public_id}`}
                        className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-surface-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium">
                            {form.name}
                          </span>
                          <code className="block truncate font-mono text-[11px] text-subtle-foreground">
                            {form.public_id}
                          </code>
                        </span>
                        <FormStatusBadge status={form.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">Recent leads</h2>
                <Link href="/leads" className="text-[13px] text-primary hover:text-primary-hover">
                  All leads →
                </Link>
              </div>
              {leads.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    No submissions yet — they appear here the moment one arrives.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {leads.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-surface-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px]">
                            {leadPreview(lead)}
                          </span>
                          <span className="block text-[11px] text-subtle-foreground">
                            {new Date(lead.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                        <Inbox className="h-3.5 w-3.5 flex-none text-subtle-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}