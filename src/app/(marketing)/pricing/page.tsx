import { Check, Minus } from 'lucide-react';
import { Badge, Card, LinkButton } from '@/components/ui';
import { PLANS, PLAN_IDS } from '@/lib/plans';

export const metadata = {
  title: 'Pricing',
  description:
    'Three simple plans. Start free with one form, upgrade when your forms earn it. Limits are enforced server-side.',
};

const FEATURES: Array<{ key: keyof (typeof PLANS)['free']; label: string }> = [
  { key: 'forms', label: 'Forms' },
  { key: 'monthlyLeads', label: 'Leads / month' },
  { key: 'viewers', label: 'Client viewers' },
];

const SHARED_INCLUDED = [
  'POST /api/f/[formId] HTML endpoint',
  'JSON API with rotating form secret',
  'Lead statuses and search',
  'Basic analytics',
  'Read-only client portal',
  'Row-level security per workspace',
];

const FAQ = [
  {
    q: 'What counts as a lead?',
    a: 'One successfully stored submission. Retries that hit the same idempotency key, and submissions dropped by the spam honeypot, are not counted.',
  },
  {
    q: 'What happens when I reach my monthly limit?',
    a: 'The endpoint returns 402 QUOTA_EXCEEDED with a clear message for the visitor. Nothing already stored is deleted, and the counter resets on the first day of each calendar month.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Billing is managed from the Billing page in your dashboard. Downgrading never deletes data — new usage is simply restricted to the new plan.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. Free includes one form, 100 leads per month, and one client viewer — enough to connect a real site and validate the workflow.',
  },
  {
    q: 'How is payment handled?',
    a: 'Billing runs through Lemon Squeezy. Your current plan, its status, and any billing actions are shown on the Billing page of your dashboard.',
  },
];

function formatLimit(value: number | null) {
  return value === null ? 'Unlimited' : value.toLocaleString();
}

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="container-page py-16 text-center md:py-20">
          <Badge className="border-primary/25 bg-primary/10 text-primary">Pricing</Badge>
          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Start free. Upgrade when your forms earn it.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Every plan includes the HTML endpoint, the JSON API, lead management, basic
            analytics, and the read-only client portal. Plans differ only in volume.
          </p>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container-page -mt-10 pb-16 md:pb-20">
          <div className="grid gap-4 md:grid-cols-3">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              const highlighted = id === 'pro';
              return (
                <Card
                  key={id}
                  className={`flex flex-col p-6 ${highlighted ? 'border-primary/50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold">{plan.displayName}</h2>
                    {highlighted && (
                      <Badge className="border-primary/25 bg-primary/10 text-primary">
                        Most popular
                      </Badge>
                    )}
                  </div>

                  <p className="mt-5 text-4xl font-semibold tracking-tight">
                    ${plan.monthyPriceUsd}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                  <p className="mt-2 text-[13px] text-muted-foreground">{plan.blurb}</p>

                  <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
                    {FEATURES.map((feature) => (
                      <div key={feature.key} className="flex items-center justify-between">
                        <dt className="text-muted-foreground">{feature.label}</dt>
                        <dd className="font-medium tabular-nums">
                          {formatLimit(plan[feature.key] as number | null)}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <ul className="mt-6 space-y-2 border-t border-border pt-5">
                    {SHARED_INCLUDED.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-[13px] text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <LinkButton
                      href={id === 'free' ? '/sign-up' : '/sign-up'}
                      variant={highlighted ? 'primary' : 'secondary'}
                      className="w-full"
                    >
                      {id === 'free' ? 'Start free' : `Choose ${plan.displayName}`}
                    </LinkButton>
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="mt-8 flex items-start gap-2 text-center text-xs text-subtle-foreground sm:justify-center">
            <Minus className="mt-0.5 h-3 w-3 flex-none" aria-hidden="true" />
            <span className="max-w-2xl">
              Limits are enforced server-side, not in the interface. Prices are monthly and
              shown in USD. Plan changes and billing details appear on the Billing page of
              your dashboard.
            </span>
          </p>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container-page grid gap-10 py-14 md:py-16 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Billing questions</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Straight answers about what counts, what happens at a limit, and where billing
              lives.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-medium text-foreground marker:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border border-border text-muted-foreground transition-transform duration-150 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-page flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Try it with one form.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No credit card required to create a workspace.
            </p>
          </div>
          <LinkButton href="/sign-up" size="lg">
            Get Started
          </LinkButton>
        </div>
      </section>
    </>
  );
}