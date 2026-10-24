import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import { Badge, Card, LinkButton } from '@/components/ui';
import { CodeBlock } from '@/components/code';

export const metadata = {
  title: 'How It Works',
  description:
    'Website form → Formivo endpoint → Supabase storage → your dashboard → an optional read-only client portal.',
};

const FLOW = [
  { label: 'Website Form', detail: 'Your existing HTML or framework form' },
  { label: 'Formivo Endpoint', detail: 'POST /api/f/[formId]' },
  { label: 'Supabase Storage', detail: 'Validated, scoped, stored as a lead' },
  { label: 'Developer Dashboard', detail: 'Search, statuses, analytics' },
  { label: 'Client Portal', detail: 'Optional read-only view per form' },
];

const STEPS = [
  {
    title: 'Create a form connection',
    body:
      'Name the form after the place it lives on your site — “Contact Form”, “Booking Form”. Formivo generates a form ID such as frm_2c9a41be7f and a matching endpoint URL. Nothing is published anywhere; it is simply your address.',
    code: `https://formivo.faizyab.me/api/f/frm_2c9a41be7f`,
    lang: 'bash',
    filename: 'endpoint',
  },
  {
    title: 'Point your form at the endpoint',
    body:
      'Set the action attribute on the form you already have. Keep method="POST" and give every input a name attribute — Formivo stores the names and values exactly as submitted. No SDK, no account for the visitor, no JavaScript required.',
    code: `<form action="https://formivo.faizyab.me/api/f/frm_2c9a41be7f" method="POST">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message"></textarea>
  <button type="submit">Send Message</button>
</form>`,
    lang: 'html',
    filename: 'index.html',
  },
  {
    title: 'Receive the submission',
    body:
      'When a visitor submits, Formivo validates the content type and size, applies rate limiting, checks the honeypot, resolves the form record, and stores the payload in one atomic database operation. The visitor sees a branded success page; you see a lead.',
    code: `HTTP/1.1 200 OK
Content-Type: application/json
x-request-id: req_9f2c41ab

{ "success": true, "leadId": "6b1f0a2e", "message": "Submission received." }`,
    lang: 'http',
    filename: 'success response',
  },
  {
    title: 'Manage the lead and share access',
    body:
      'Open the lead to read every field, move it through New → Contacted → Qualified → Converted, and read the analytics. If a client should see this form’s results, invite their email address — they get a read-only portal for that one form.',
  },
];

const PERMISSIONS: Array<{ allowed: boolean; text: string }> = [
  { allowed: true, text: 'View submissions for the form they were invited to' },
  { allowed: true, text: 'See basic analytics for that form' },
  { allowed: true, text: 'Search and open submission details' },
  { allowed: false, text: 'See any other form in your workspace' },
  { allowed: false, text: 'Read your form secret or endpoint configuration' },
  { allowed: false, text: 'Edit, archive, or delete forms and submissions' },
  { allowed: false, text: 'Open workspace settings or billing' },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero + flow diagram */}
      <section className="border-b border-border">
        <div className="container-page py-16 md:py-20">
          <Badge className="border-primary/25 bg-primary/10 text-primary">How it works</Badge>
          <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            From a form on your site to a lead your client can see.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Formivo sits between your existing form and the people who need the data.
            Five stages, no rebuild, no backend to deploy per project.
          </p>

          {/* Connected-line motif — the logo's structural signature */}
          <div className="mt-10 overflow-x-auto scroll-thin">
            <ol className="flex min-w-[760px] items-stretch gap-0">
              {FLOW.map((node, i) => (
                <li key={node.label} className="flex flex-1 items-center">
                  <div className="flex-1 rounded-lg border border-border bg-surface px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 flex-none rounded-full bg-primary" aria-hidden="true" />
                      <p className="text-[13px] font-semibold text-foreground">{node.label}</p>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-subtle-foreground">{node.detail}</p>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className="flex w-8 flex-none items-center" aria-hidden="true">
                      <div className="h-px w-full bg-border-strong" />
                      <span className="absolute h-1.5 w-1.5 -translate-x-4 rounded-full bg-border-strong" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="border-b border-border">
        <div className="container-page py-14 md:py-16">
          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <div key={step.title} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <p className="font-mono text-[12px] text-primary">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">{step.title}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
                <div>
                  {step.code ? (
                    <CodeBlock
                      lang={step.lang}
                      filename={step.filename}
                      code={step.code}
                    />
                  ) : (
                    <Card className="p-5">
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        Both the developer view and the client view are driven by the same
                        stored record — there is no second copy of your data to keep in sync.
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form IDs explained */}
      <section className="border-b border-border bg-surface/40">
        <div className="container-page grid gap-8 py-14 md:py-16 lg:grid-cols-3">
          {[
            {
              title: 'Form ID',
              body: 'A public identifier like frm_2c9a41be7f. It appears in the endpoint URL and is safe to expose — it only routes a submission to the right form. It never grants read access to anything.',
            },
            {
              title: 'Form secret',
              body: 'Only needed for the JSON API. Stored as a SHA-256 hash, shown once at creation, rotatable from the form page. Plain HTML forms do not use it, so keep it server-side.',
            },
            {
              title: 'Lead record',
              body: 'The stored payload plus the form and workspace it belongs to, a status, and a timestamp. The workspace association is derived from the form row on the server — never from the request.',
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-[15px] font-semibold">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Client permissions */}
      <section className="border-b border-border">
        <div className="container-page grid gap-10 py-14 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
              Client permissions
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Read-only, and only for the form they were invited to.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              When you invite a client, they sign in with their own account and accept the
              invitation. Access is stored as a per-form relationship and enforced by
              database policies — hiding navigation is not the control.
            </p>
            <Link
              href="/docs#client-access"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Read the access model
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <Card className="p-6">
            <p className="text-[13px] font-semibold text-foreground">A client can</p>
            <ul className="mt-3 space-y-2.5">
              {PERMISSIONS.filter((p) => p.allowed).map((p) => (
                <li key={p.text} className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-success" aria-hidden="true" />
                  {p.text}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[13px] font-semibold text-foreground">A client cannot</p>
            <ul className="mt-3 space-y-2.5">
              {PERMISSIONS.filter((p) => !p.allowed).map((p) => (
                <li key={p.text} className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
                  <X className="mt-0.5 h-3.5 w-3.5 flex-none text-danger" aria-hidden="true" />
                  {p.text}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="py-16">
        <div className="container-page flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ready to connect a form?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The free plan covers one form and 100 leads a month.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/sign-up" size="lg">Get Started</LinkButton>
            <LinkButton href="/docs" variant="secondary" size="lg">Read the docs</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}