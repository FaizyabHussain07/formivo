import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Check,
  Database,
  FileText,
  Inbox,
  Lock,
  Minus,
  Plus,
  Share2,
  Terminal,
} from 'lucide-react';
import { LinkButton, Card, Badge } from '@/components/ui';
import { CodeBlock } from '@/components/code';
import { DashboardPreview, IntegrationSnippet } from '@/components/product-preview';

export const metadata = {
  title: 'Formivo — Your forms. Your backend. Your leads in one place.',
  description:
    'Connect your existing website forms to Formivo with a single endpoint. Collect submissions, manage leads, and share them with your clients without building another backend.',
};

const STEPS = [
  {
    title: 'Create a form connection',
    body: 'Name your form in Formivo. You get an endpoint URL you can point any existing form at.',
    icon: FileText,
  },
  {
    title: 'Point your existing form at it',
    body: 'Keep your current HTML, React, or WordPress form. Send its payload to the endpoint as JSON — the docs include copy-paste examples.',
    icon: Terminal,
  },
  {
    title: 'Collect submissions',
    body: 'Every valid submission is stored, counted against your plan, and shows up in your dashboard immediately.',
    icon: Inbox,
  },
  {
    title: 'Manage leads and share access',
    body: 'Move leads through your pipeline, read the analytics, and invite a client to a read-only view of one form.',
    icon: Share2,
  },
];

const FEATURES = [
  {
    title: 'One endpoint per form',
    body: 'A stable POST endpoint for each form, authenticated with a per-form secret you can rotate at any time.',
    icon: Terminal,
  },
  {
    title: 'Submission collection',
    body: 'Flexible JSON payloads — no fixed schema. Size limits, rate limits, and idempotency keys are handled for you.',
    icon: Database,
  },
  {
    title: 'Central lead management',
    body: 'Search submissions, read the full payload, and move leads through New, Contacted, Qualified, Converted, or Archived.',
    icon: Inbox,
  },
  {
    title: 'Basic analytics',
    body: 'Lead volume over time, totals per form, and status distribution — computed from your real records.',
    icon: BarChart3,
  },
  {
    title: 'Form-specific client access',
    body: 'Invite a client by email to exactly one form. They get a read-only portal, never your API configuration.',
    icon: Share2,
  },
  {
    title: 'Workspace isolation',
    body: 'Row-level security scopes every query to your workspace. Client permissions are checked per form, not per account.',
    icon: Lock,
  },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'What is Formivo?',
    a: 'A form backend for developers and agencies. You keep the forms you have already built; Formivo receives their submissions, stores them as leads, and gives you a dashboard plus an optional read-only portal for each client.',
  },
  {
    q: 'How do I connect an existing HTML form?',
    a: 'Create a form in the dashboard, copy the endpoint and secret, then send the form values to that endpoint as a JSON body with an Authorization header. The docs include HTML, fetch, and curl examples you can copy.',
  },
  {
    q: 'Do I need to build my own backend?',
    a: 'No. The endpoint, validation, storage, plan limits, and lead records already exist. You only wire your form to the endpoint — there is no database, queue, or admin panel to stand up per project.',
  },
  {
    q: 'Can I use Formivo with React or Next.js?',
    a: 'Yes. Any client or server code that can make an HTTP request works: a fetch call in a React submit handler, a server action in Next.js, or a plain form post proxied through your server.',
  },
  {
    q: 'Where do submissions appear?',
    a: 'On the Leads page of your dashboard, newest first, with search, status filters, and a per-form filter. Each lead opens into the full submitted payload and any metadata you sent.',
  },
  {
    q: 'Can I share submissions with a client?',
    a: 'Yes. Invite a client email address to a single form. After they accept, they see that form’s leads and analytics in a read-only client portal — no workspace settings, no billing, no secrets.',
  },
  {
    q: 'Is a form builder included?',
    a: 'No. Formivo does not include a drag-and-drop builder. It connects the forms you already have. A builder is on the roadmap but is not part of the current product.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="container-page grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <Badge className="border-primary/25 bg-primary/10 text-primary">
              Lead infrastructure for modern websites
            </Badge>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-5xl">
              Your forms. Your backend. Your leads in one place.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-[17px]">
              Connect your existing website forms to Formivo with a single endpoint.
              Collect submissions, manage leads, and share them with your clients
              without building another backend.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/sign-up" size="lg">
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/how-it-works" variant="secondary" size="lg">
                See How It Works
              </LinkButton>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
              {[
                'No form rebuild',
                'No backend to deploy',
                'Read-only client portal',
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-4">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Integration demonstration ───────────────────────── */}
      <section className="border-b border-border bg-surface/40">
        <div className="container-page grid items-start gap-10 py-16 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
              Integration
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Point the form you already have at one endpoint.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Nothing about your markup has to change. Formivo accepts a JSON{' '}
              <code className="rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-[12px] text-foreground">
                data
              </code>{' '}
              object with an Authorization header carrying a per-form form secret, so
              wire your form&apos;s submit event (or proxy it through your server) and the
              submission is stored as a lead.
            </p>

            <div className="mt-6 space-y-3">
              {[
                'POST endpoint unique to each form',
                'Form secret compared in constant time and stored as a hash',
                '100 KB payload cap and per-IP rate limiting',
                'Idempotency-Key supported for safe retries',
              ].map((line) => (
                <p key={line} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" aria-hidden="true" />
                  {line}
                </p>
              ))}
            </div>

            <Link
              href="/docs"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Read the integration docs
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <IntegrationSnippet />
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container-page py-16 md:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Connect, collect, manage, share.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Four steps between the form on your site and a lead your client can see.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative">
                  <Card className="h-full p-5">
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-[11px] text-subtle-foreground">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </Card>
                  {i < STEPS.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="absolute -right-2.5 top-1/2 hidden h-px w-4 bg-border-strong xl:block"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container-page py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                Features
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                Everything after the form.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Your website already collects the submission. Formivo handles what
                happens next.
              </p>
            </div>
            <Link
              href="/features"
              className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              All features →
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Developer experience ────────────────────────────── */}
      <section className="border-b border-border bg-surface/40">
        <div className="container-page grid gap-10 py-16 md:py-20 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
              Security & developer experience
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Stop rebuilding form backends for every project.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Each project usually needs the same thing: somewhere to POST a form,
              validation, storage, an admin view, and a way to show a client their
              results. Formivo provides that layer so you can spend the time on the
              site itself.
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  title: 'Secrets stay on the server',
                  body: 'Form secrets are stored only as SHA-256 hashes, compared in constant time, and rotatable from the dashboard.',
                },
                {
                  title: 'Authorization is enforced in the database',
                  body: 'Supabase row-level security scopes every query to your workspace, and form access is checked per client.',
                },
                {
                  title: 'Known limits, predictable responses',
                  body: 'Structured JSON errors with machine-readable codes and a request ID you can quote when reporting a problem.',
                },
              ].map((item) => (
                <div key={item.title} className="border-l-2 border-primary/40 pl-4">
                  <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-subtle-foreground">
              Formivo is a form backend, not a security audit. Keep secrets out of
              client-side code where you can, and review the{' '}
              <Link href="/docs#security" className="text-primary underline underline-offset-2 hover:text-primary-hover">
                security notes
              </Link>{' '}
              before launch.
            </p>
          </div>

          <div className="space-y-4">
            <CodeBlock
              lang="http"
              filename="Response · 200"
              code={`HTTP/1.1 200 OK
Content-Type: application/json
x-request-id: req_9f2c41ab

{
  "success": true,
  "leadId": "6b1f0a2e-…",
  "message": "Submission received."
}`}
            />
            <CodeBlock
              lang="http"
              filename="Response · 401"
              code={`HTTP/1.1 401 Unauthorized
Content-Type: application/json
x-request-id: req_31d70c55

{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid form secret.",
    "requestId": "req_31d70c55"
  }
}`}
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container-page grid gap-10 py-16 md:py-20 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
              FAQ
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Questions, answered plainly.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              If something is not built yet, we say so.
            </p>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-foreground marker:hidden">
                  {item.q}
                  <Plus
                    className="h-4 w-4 flex-none text-muted-foreground transition-transform duration-150 group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-8 md:p-12">
            <div className="relative max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Forms to leads. Leads to clients.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Create a workspace, connect your first form, and see a submission
                arrive in the dashboard. The free plan covers one form and 100 leads
                a month.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href="/sign-up">Get Started</LinkButton>
                <LinkButton href="/pricing" variant="secondary">
                  See pricing
                </LinkButton>
              </div>
            </div>
            <Minus className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rotate-45 text-primary/10" aria-hidden="true" />
          </div>
        </div>
      </section>
    </>
  );
}