import { MarketingHeader, MarketingFooter } from "@/components/marketing";
import { LinkButton, Card, Badge } from "@/components/ui";
import { PLANS } from "@/lib/plans";

const planOrder = ["free", "pro", "agency"] as const;

const features = [
  ["forms", "Forms"],
  ["monthlyLeads", "Leads / month"],
  ["viewers", "Client viewers"],
] as const;

function formatLimit(value: number | null) {
  return value === null ? "Unlimited" : value.toLocaleString();
}

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <section className="container-page py-16 md:py-24">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
            <p className="mt-3 text-muted-foreground">
              Start free. Upgrade when your forms need more. Every plan includes custom
              form endpoints, lead management, and basic analytics.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {planOrder.map((id) => {
              const plan = PLANS[id];
              const highlighted = id === "pro";
              return (
                <Card key={id} className={highlighted ? "border-primary/40 p-6" : "p-6"}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold">{plan.displayName}</h2>
                    {highlighted && <Badge className="border-primary/25 text-primary">Popular</Badge>}
                  </div>
                  <p className="mt-4 text-4xl font-semibold tracking-tight">
                    ${plan.monthyPriceUsd}
                    <span className="text-base font-normal text-muted-foreground">/month</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>

                  <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
                    {features.map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium">{formatLimit(plan[key])}</dd>
                      </div>
                    ))}
                  </dl>

                  <LinkButton
                    href="/sign-up"
                    variant={highlighted ? "primary" : "secondary"}
                    className="mt-6 w-full"
                  >
                    {id === "free" ? "Start Free" : `Choose ${plan.displayName}`}
                  </LinkButton>
                </Card>
              );
            })}
          </div>

          <p className="mt-10 text-center text-sm text-subtle-foreground">
            Limits are enforced server-side. Downgrading never deletes your data —
            new usage is simply restricted to your plan.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
