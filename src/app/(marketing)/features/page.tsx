import Link from 'next/link';
import { ArrowRight, BarChart3, Database, Inbox, Lock, Share2, Terminal } from 'lucide-react';
import { Badge, Card, LinkButton } from '@/components/ui';
import { CodeBlock } from '@/components/code';

export const metadata = {
  title: 'Features',
  description:
    'Everything Formivo does: endpoint integration, submission collection, lead management, basic analytics, and form-specific client access.',
};

const SECTIONS = [
  {
    id: 'integration',
    icon: Terminal,
    title: 'Form integration',
    lead: 'One endpoint per form. Point your existing form at it and you are done.',
    points: [
      'Plain HTML forms work with only an action attribute and method="POST".',
      'Accepts application/x-www-form-urlencoded, multipart/form-data, and JSON.',
      'Field names and values are preserved exactly as submitted.',
      'Optional same-origin redirect after submit, with open-redirect protection.',
      'A JSON API with a rotating Bearer secret is available for server-side callers.',
    ],
    code: `<form action="https://formivo.faizyab.me/api/f/YOUR_FORM_ID" method="POST">
  <input name="email" type="email" required />
  <button type="submit">Submit</button>
</form>`,
    lang: 'html',
    filename: 'index.html',
  },
  {
    id: 'submissions',
    icon: Database,
    title: 'Submission collection',
    lead: 'Every valid post becomes a stored record tied to the form that received it.',
    points: [
      'Flexible payloads — no fixed schema, so different forms can send different fields.',
      '100 KB payload cap and 60 requests per minute per IP.',
      'Optional honeypot field to quietly drop bot submissions.',
      'Idempotency keys supported on the JSON API for safe retries.',
      'Quota enforcement runs inside the database transaction, not in the UI.',
    ],
  },
  {
    id: 'leads',
    icon: Inbox,
    title: 'Lead management',
    lead: 'Read the whole submission, then move it through a lightweight pipeline.',
    points: [
      'Search by name or email, filter by form and by status, paginate large lists.',
      'Statuses: New, Contacted, Qualified, Converted, Archived.',
      'Every value is rendered as text — submitted content is never executed as markup.',
      'Metadata such as source page and user agent is stored alongside the payload.',
    ],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Basic analytics',
    lead: 'Numbers computed from your own records — nothing is estimated or invented.',
    points: [
      'Total leads, new leads, and leads this month.',
      'Status distribution across the workspace.',
      'Per-form lead counts in the forms list.',
      'Empty states instead of fabricated charts when you have no data yet.',
    ],
  },
  {
    id: 'client-access',
    icon: Share2,
    title: 'Client access',
    lead: 'Give a client a read-only view of exactly one form.',
    points: [
      'Invite by email; the invitation link is single-use and expires.',
      'Clients see submissions and basic analytics for their form only.',
      'No workspace settings, no billing, no endpoints, no secrets.',
      'Revoking access takes effect immediately — authorization lives in the database.',
    ],
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Security posture',
    lead: 'What the platform actually does, stated plainly.',
    points: [
      'Supabase Row Level Security scopes every query to your workspace.',
      'Form secrets are stored as SHA-256 hashes and compared in constant time.',
      'Client permission is checked per form, never per account alone.',
      'Public form IDs are routing keys, not authorization — visitors cannot read submissions.',
      'Formivo is a form backend, not a substitute for your own security review.',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="container-page py-16 md:py-20">
          <Badge className="border-primary/25 bg-primary/10 text-primary">Features</Badge>
          <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            Everything after the form.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Your website already collects the submission. Formivo handles what happens
            next — capture, storage, lead management, analytics, and a client-ready
            view. Every claim on this page maps to something the product does today.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="/sign-up">Get Started</LinkButton>
            <LinkButton href="/how-it-works" variant="secondary">
              See how it works
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface/40">
        <div className="container-page py-12">
          <nav aria-label="On this page" className="flex flex-wrap gap-2">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {SECTIONS.map((section, index) => {
        const Icon = section.icon;
        return (
          <section
            key={section.id}
            id={section.id}
            className={`scroll-mt-20 border-b border-border ${index % 2 === 1 ? 'bg-surface/40' : ''}`}
          >
            <div className="container-page grid gap-10 py-14 md:py-16 lg:grid-cols-2">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                  {section.title}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {section.lead}
                </p>
                <ul className="mt-6 space-y-3">
                  {section.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {section.code ? (
                  <CodeBlock lang={section.lang} filename={section.filename} code={section.code} />
                ) : (
                  <Card className="h-full p-6">
                    <p className="text-[13px] font-medium text-foreground">
                      Where this lives in the app
                    </p>
                    <div className="mt-4 space-y-3 text-[13px] text-muted-foreground">
                      {section.id === 'submissions' && (
                        <p>
                          Validated in the route handler, stored through a single atomic
                          database function, visible immediately under{' '}
                          <Link href="/docs" className="text-primary underline underline-offset-2">
                            Leads
                          </Link>.
                        </p>
                      )}
                      {section.id === 'leads' && (
                        <p>
                          Dashboard → Leads. Search, status filter, and form filter run
                          server-side against your workspace only.
                        </p>
                      )}
                      {section.id === 'analytics' && (
                        <p>
                          Dashboard → Analytics. Counts and distributions are aggregated
                          from the leads table on each request.
                        </p>
                      )}
                      {section.id === 'client-access' && (
                        <p>
                          Dashboard → Client Access, and a dedicated{' '}
                          <span className="font-mono text-[12px] text-foreground">/client</span>{' '}
                          portal with its own navigation.
                        </p>
                      )}
                      {section.id === 'security' && (
                        <p>
                          Enforced in Supabase RLS policies and server route handlers —
                          hiding a button is never the control.
                        </p>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </section>
        );
      })}

      <section className="py-16">
        <div className="container-page flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              See it against your own form.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a workspace, connect one endpoint, and watch a real submission arrive.
            </p>
          </div>
          <LinkButton href="/sign-up" size="lg">
            Get Started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkButton>
        </div>
      </section>
    </>
  );
}