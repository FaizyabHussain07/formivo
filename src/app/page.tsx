import Link from "next/link";
import { MarketingHeader, MarketingFooter } from "@/components/marketing";
import { LinkButton, CodeBlock, Card } from "@/components/ui";
import { PLANS } from "@/lib/plans";

const steps = [
  {
    title: "Connect your form",
    body: "Send submissions from your existing website form to a Formivo endpoint.",
  },
  {
    title: "Manage your leads",
    body: "Every valid submission becomes a lead you can search, review, and organize.",
  },
  {
    title: "Give clients access",
    body: "Invite clients to a focused read-only dashboard without exposing your technical configuration.",
  },
];

const flow = ["Your Website", "Existing Form", "Formivo API", "Lead", "Formivo Dashboard"];

const integrationSample = `await fetch("https://your-formivo-domain.com/api/v1/forms/frm_abc123/submissions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer fmv_live_...",
  },
  body: JSON.stringify({
    data: { name: "John Doe", email: "john@example.com" },
  }),
});\n\n// → { "success": true, "leadId": "lead_123", "message": "Submission received." }`;

const planOrder = ["free", "pro", "agency"] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="container-page flex flex-col items-center py-20 text-center md:py-28">
            <p className="badge mb-6 border-primary/25 text-primary">
              For developers &amp; agencies
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Connect your forms. Capture your leads. Give clients their dashboard.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Formivo gives developers a simple, secure way to connect existing website
              forms, manage incoming leads, and give clients a professional read-only dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/sign-up" size="lg">
                Start Free
              </LinkButton>
              <LinkButton href="/docs" variant="secondary" size="lg">
                View Documentation
              </LinkButton>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-border py-16 md:py-20">
          <div className="container-page">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Three steps between your existing form and a professional lead dashboard.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, i) => (
                <Card key={step.title} className="p-6">
                  <p className="text-xs font-medium text-primary">Step {i + 1}</p>
                  <h3 className="mt-2 text-[15px] font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Developer workflow */}
        <section className="border-b border-border py-16 md:py-20">
          <div className="container-page grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Works with the forms you already built
              </h2>
              <p className="mt-3 text-muted-foreground">
                HTML, React, WordPress, Webflow — anything that can make an HTTP request.
                Point your existing form at your Formivo endpoint and every valid submission
                becomes a lead.{" "}
                <span className="font-medium text-foreground">No form rebuild required.</span>
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface p-6">
              {flow.map((node, i) => (
                <div key={node}>
                  <div className="flex justify-center rounded-md border border-border bg-surface-muted px-4 py-2 font-mono text-[13px]">
                    {node}
                  </div>
                  {i < flow.length - 1 && (
                    <div aria-hidden className="flex justify-center py-1 text-subtle-foreground">
                      ↓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integration sample */}
        <section className="border-b border-border py-16 md:py-20">
          <div className="container-page grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                One endpoint. One secret. Done.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Create a form in Formivo, copy your endpoint and secret, and submit.
                Your dashboard fills itself.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Keep your secret on your server whenever possible — see the{" "}
                <Link href="/docs" className="text-link underline-offset-4 hover:underline">
                  security guidance
                </Link>
                .
              </p>
            </div>
            <CodeBlock>{integrationSample}</CodeBlock>
          </div>
        </section>

        {/* Client dashboard */}
        <section className="border-b border-border py-16 md:py-20">
          <div className="container-page">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Clients see the leads they need. Your credentials stay private.
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Invite a client to a specific form and they get a clean read-only dashboard —
              their leads, their analytics. No API secrets, no developer settings, no billing.
            </p>
          </div>
        </section>

        {/* Pricing summary */}
        <section className="py-16 md:py-20">
          <div className="container-page">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Simple, honest pricing
            </h2>
            <p className="mt-2 text-muted-foreground">
              Start free. Upgrade when your forms earn it.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {planOrder.map((id) => {
                const plan = PLANS[id];
                return (
                  <Card
                    key={id}
                    className={id === "pro" ? "border-primary/40 p-6" : "p-6"}
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-[15px] font-semibold">{plan.displayName}</h3>
                      <p className="text-2xl font-semibold tracking-tight">
                        ${plan.monthyPriceUsd}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                    <LinkButton
                      href="/pricing"
                      variant={id === "pro" ? "primary" : "secondary"}
                      size="sm"
                      className="mt-5 w-full"
                    >
                      {id === "free" ? "Start Free" : `Choose ${plan.displayName}`}
                    </LinkButton>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
