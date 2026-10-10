import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { Button, Card, Badge, LeadStatusBadge } from '@/components/ui';
import { AppShell } from '@/components/app-shell';
import Link from 'next/link';

export const metadata = { title: 'Dashboard' };

/* ── Presentational (server-renderable) pieces ─────────────────────── */

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

interface FormRow {
  id: string;
  public_id: string;
  name: string;
  status: string;
  created_at: string;
}

interface LeadRow {
  id: string;
  data: Record<string, unknown> | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'archived';
  created_at: string;
}

function FormsTable({ forms }: { forms: FormRow[] }) {
  if (forms.length === 0) {
    return (
      <EmptyState
        title="No forms yet"
        description="Send submissions from your website to Formivo and start managing leads."
        action={
          <Link href="/forms/new">
            <Button variant="secondary">Create Form</Button>
          </Link>
        }
      />
    );
  }
  return (
    <div className="space-y-2">
      {forms.map((form) => (
        <Link
          key={form.id}
          href={`/forms/${form.public_id}`}
          className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-surface-muted"
        >
          <div>
            <p className="font-medium">{form.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Created {new Date(form.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge>{form.status}</Badge>
        </Link>
      ))}
    </div>
  );
}

function LeadsList({ leads }: { leads: LeadRow[] }) {
  if (leads.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No leads yet. Once your form receives a submission, it will appear here.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <Link
          key={lead.id}
          href={`/leads/${lead.id}`}
          className="block rounded-md border border-border p-3 transition-colors hover:bg-surface-muted"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium">
              {String(lead.data?.name ?? 'Lead')}
              {lead.data?.email ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  {String(lead.data.email)}
                </span>
              ) : null}
            </p>
            <LeadStatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(lead.created_at).toLocaleDateString()}
          </p>
        </Link>
      ))}
    </div>
  );
}

function StatsCard({ forms, leads, clients }: { forms: number; leads: number; clients: number }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Workspace Stats</h3>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Forms</span>
          <span className="font-medium">{forms}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Leads</span>
          <span className="font-medium">{leads}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Clients</span>
          <span className="font-medium">{clients}</span>
        </div>
      </div>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Quick Actions</h3>
      <div className="mt-3 space-y-2">
        <Link href="/forms/new">
          <Button variant="secondary" className="w-full justify-start">
            + Create Form
          </Button>
        </Link>
        <Link href="/clients">
          <Button variant="secondary" className="w-full justify-start">
            + Invite Client
          </Button>
        </Link>
        <Link href="/analytics">
          <Button variant="secondary" className="w-full justify-start">
            View Analytics
          </Button>
        </Link>
      </div>
    </Card>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect('/sign-in');
  }

  const [{ data: membership }, { workspace }] = await Promise.all([
    supabase
      .from('workspace_memberships')
      .select('*, workspace:workspaces(*)')
      .eq('user_id', user.id)
      .maybeSingle(),
    (async () => {
      // resolve searchParams once
      return { workspace: (await searchParams).workspace };
    })(),
  ]);

  const justCreatedWorkspace = workspace === 'created';
  const ws = membership?.workspace ?? null;

  // No workspace yet → onboarding empty state
  if (!ws) {
    return (
      <DashboardShell user={{ id: user.id, email: user.email }} title="Workspace">
        <Card className="p-6">
          <EmptyState
            title="Create your workspace"
            description="A workspace holds your forms, leads, and clients. Create one to get started."
            action={
              <Link href="/onboarding">
                <Button>Create Workspace</Button>
              </Link>
            }
          />
        </Card>
      </DashboardShell>
    );
  }

  // Fetch dashboard data in parallel (all RLS-scoped server-side)
  const [formsRes, leadsRes, clientsRes] = await Promise.all([
    supabase
      .from('forms')
      .select('id, public_id, name, status, created_at')
      .eq('workspace_id', ws.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('leads')
      .select('id, data, status, created_at')
      .eq('workspace_id', ws.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('client_form_access')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ws.id),
  ]);

  const forms = (formsRes.data ?? []) as FormRow[];
  const leads = (leadsRes.data ?? []) as LeadRow[];
  const clientsCount = clientsRes.count ?? 0;

  return (
    <DashboardShell user={{ id: user.id, email: user.email }} title={ws.name} created={justCreatedWorkspace}>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Forms</h2>
              <Link href="/forms/new">
                <Button size="sm">Create Form</Button>
              </Link>
            </div>
            <FormsTable forms={forms} />
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Leads</h2>
              <Link href="/leads" className="text-sm text-link hover:underline">
                View all
              </Link>
            </div>
            <LeadsList leads={leads} />
          </div>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <StatsCard forms={forms.length} leads={leads.length} clients={clientsCount} />
          <QuickActions />
        </div>
      </div>
    </DashboardShell>
  );
}

function DashboardShell({
  user,
  title,
  created,
  children,
}: {
  user: { id: string; email: string };
  title: string;
  created?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AppShell user={user} workspaceName={title === 'Workspace' ? undefined : title}>
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <p className="text-lg font-semibold">{title}</p>
          {created && (
            <Badge className="border-success/30 bg-success-soft text-success">
              Created
            </Badge>
          )}
        </div>
      </div>
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        {created && <GettingStartedBanner />}
        {children}
      </div>
    </AppShell>
  );
}

/**
 * Shown right after workspace creation — walks the developer through the
 * core V1 loop (PRD §4 / roadmap Phase 4 entry point).
 */
function GettingStartedBanner() {
  const steps = [
    {
      title: 'Create your first form',
      body: 'Formivo generates an endpoint and secret for your existing website form.',
      href: '/forms/new',
      cta: 'Create Form',
    },
    {
      title: 'Connect your website',
      body: 'Point your form at the endpoint — no rebuild required.',
      href: '/docs',
      cta: 'Read the docs',
    },
    {
      title: 'Watch leads arrive',
      body: 'Every valid submission becomes a lead in this dashboard.',
      href: '/leads',
      cta: 'View Leads',
    },
  ];

  return (
    <Card className="mb-6 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Workspace created — you're all set</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Three steps to your first lead:
          </p>
        </div>
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="rounded-lg border border-border bg-surface-muted/50 p-4"
          >
            <p className="text-xs font-medium text-primary">Step {i + 1}</p>
            <p className="mt-1 text-sm font-medium">{step.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
            <Link
              href={step.href}
              className="mt-2 inline-block text-xs font-medium text-link hover:underline"
            >
              {step.cta} →
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
