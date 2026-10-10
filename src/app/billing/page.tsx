import { AppShell } from '@/components/app-shell';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { Card, Badge, Button } from '@/components/ui';
import { PLANS, PLAN_IDS, type PlanId } from '@/lib/plans';

export const metadata = { title: 'Billing' };

export default async function BillingPage() {
  const { supabase, user, workspace } = await requireWorkspace();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end')
    .eq('workspace_id', workspace.id)
    .maybeSingle();

  const currentPlan: PlanId = (subscription?.plan as PlanId) ?? 'free';
  const current = PLANS[currentPlan];

  return (
    <AppShell user={user} workspaceName={workspace.name}>
      <PageHeader title="Billing" />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
                {current.displayName}
                <Badge className="border-success/30 bg-success-soft text-success">
                  {subscription?.status ?? 'active'}
                </Badge>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{current.blurb}</p>
            </div>
            <Button disabled title="Checkout arrives with the Lemon Squeezy phase">
              Upgrade
            </Button>
          </div>
          <p className="mt-4 text-xs text-subtle-foreground">
            Checkout and plan changes activate with the Lemon Squeezy
            integration (next billing phase). Limits below are already enforced
            server-side.
          </p>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            const active = id === currentPlan;
            return (
              <Card key={id} className={active ? 'border-primary/40 p-5' : 'p-5'}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{plan.displayName}</p>
                  <p className="text-xl font-semibold tracking-tight">
                    ${plan.monthyPriceUsd}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Forms</dt>
                    <dd className="font-medium">
                      {plan.forms === null ? 'Unlimited' : plan.forms}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Leads / month</dt>
                    <dd className="font-medium">{plan.monthlyLeads?.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Client viewers</dt>
                    <dd className="font-medium">
                      {plan.viewers === null ? 'Unlimited' : plan.viewers}
                    </dd>
                  </div>
                </dl>
                {active && (
                  <p className="mt-3 text-center text-xs font-medium text-primary">
                    Current plan
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
