import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import { CodeBlock } from '@/components/code';

export const metadata = {
  title: 'Documentation',
  description:
    'Connect an existing form to Formivo: HTML integration, error codes, limits, testing and security notes.',
};

const SECTIONS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'html-integration', label: 'HTML Integration' },
  { id: 'field-naming', label: 'Field Naming' },
  { id: 'errors', label: 'Errors' },
  { id: 'limits', label: 'Rate Limits & Size' },
  { id: 'testing', label: 'Testing' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'security', label: 'Security' },
  { id: 'client-access', label: 'Client Access' },
];

const HTML_EXAMPLE = `<form action="https://formivo.faizyab.me/api/f/YOUR_FORM_ID" method="POST">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message"></textarea>
  <button type="submit">Send Message</button>
</form>`;

const HONEYPOT_EXAMPLE = `<!-- Hidden spam trap: leave it empty, bots usually fill it in. -->
<input type="text" name="website" tabindex="-1" autocomplete="off"
       style="position:absolute;left:-9999px" aria-hidden="true" />`;

const REDIRECT_EXAMPLE = `<form action="https://formivo.faizyab.me/api/f/YOUR_FORM_ID" method="POST">
  <input type="hidden" name="_redirect" value="/thanks" />
  <input type="email" name="email" required />
  <button type="submit">Send</button>
</form>`;

const JSON_EXAMPLE = `await fetch("https://formivo.faizyab.me/api/f/YOUR_FORM_ID", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com"
  })
});`;

const CURL_EXAMPLE = `curl -X POST "https://formivo.faizyab.me/api/f/YOUR_FORM_ID" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  --data-urlencode "name=John Doe" \\
  --data-urlencode "email=john@example.com"`;

const ERROR_CODES: Array<[string, string, string]> = [
  ['INVALID_REQUEST', '400', 'Missing fields, unsupported content type, or malformed body.'],
  ['QUOTA_EXCEEDED', '402', 'The monthly lead limit for the plan has been reached.'],
  ['NOT_FOUND', '404', 'No form exists for this form ID.'],
  ['FORM_INACTIVE', '409', 'The form is archived and no longer accepts submissions.'],
  ['PAYLOAD_TOO_LARGE', '413', 'The request body exceeds 100 KB.'],
  ['RATE_LIMITED', '429', 'More than 60 requests per minute from one IP. Retry-After is set.'],
  ['INTERNAL_ERROR', '500', 'Something failed on our side — quote the request ID when reporting it.'],
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-10 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_code]:rounded [&_code]:border [&_code]:border-border [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-foreground [&_p]:max-w-2xl">
        {children}
      </div>
    </section>
  );
}

export default function DocsPage() {
  const currentIndex = 0; // rendered in order; prev/next below walks the list

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-12">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:self-start">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">
          Documentation
        </p>
        <nav
          aria-label="Documentation sections"
          className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground lg:w-full"
            >
              {section.label}
            </a>
          ))}
        </nav>
        <div className="mt-6 hidden border-t border-border pt-4 lg:block">
          <Link
            href="/pricing"
            className="text-[13px] text-primary transition-colors hover:text-primary-hover"
          >
            View pricing →
          </Link>
        </div>
      </aside>

      {/* Article */}
      <article className="min-w-0">
        <div className="mb-6">
          <Badge className="border-primary/25 bg-primary/10 text-primary">Docs</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Formivo API</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Everything you need to connect an existing form, understand what happens to a
            submission, and debug a problem. All examples use the production domain
            <code className="mx-1.5 rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[12.5px] text-foreground">
              formivo.faizyab.me
            </code>
            .
          </p>
        </div>

        <Section id="introduction" title="Introduction">
          <p>
            Formivo receives submissions from forms you already built and stores them as
            leads. You do not rebuild your form — you point it at a Formivo endpoint.
          </p>
          <p>
            One endpoint handles it all: native HTML forms, JavaScript{' '}
            <code>fetch</code> calls, and server-side code.
          </p>
        </Section>

        <Section id="quick-start" title="Quick Start">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Create a form in the dashboard and copy its form ID.</li>
            <li>Set the form&apos;s action to the endpoint below.</li>
            <li>Submit the form — a branded success page appears.</li>
            <li>Open Dashboard → Leads and read the submission.</li>
          </ol>
          <CodeBlock lang="html" filename="index.html" code={HTML_EXAMPLE} />
          <p>
            That is the complete integration. No SDK, no visitor login, no server code on
            your side.
          </p>
        </Section>

        <Section id="html-integration" title="HTML Integration">
          <p>
            <strong>Endpoint</strong> — <code>POST https://formivo.faizyab.me/api/f/[formId]</code>
          </p>
          <p>
            Supported content types: <code>application/x-www-form-urlencoded</code>,
            <code>multipart/form-data</code>, and <code>application/json</code>. Standard
            HTML forms post the first two automatically.
          </p>
          <p>
            <strong>Response.</strong> Browser submissions receive a branded HTML success
            or failure page. Callers that send <code>Accept: application/json</code>{' '}
            receive the JSON body instead:
          </p>
          <CodeBlock
            lang="http"
            filename="200 OK"
            code={`{
  "success": true,
  "leadId": "6b1f0a2e",
  "message": "Submission received."
}`}
          />
          <p>
            <strong>Redirect after submit.</strong> Add a hidden <code>_redirect</code>{' '}
            field. Only same-origin paths are honoured, so the endpoint cannot be used as
            an open redirect:
          </p>
          <CodeBlock lang="html" filename="redirect" code={REDIRECT_EXAMPLE} />
          <p>
            <strong>Spam trap.</strong> Optional — add a hidden input named{' '}
            <code>website</code> that humans never see. If it arrives non-empty the
            submission is accepted and silently discarded:
          </p>
          <CodeBlock lang="html" filename="honeypot" code={HONEYPOT_EXAMPLE} />
        </Section>

        <Section id="field-naming" title="Field Naming">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Use the <code>name</code> attribute on every input — it becomes the key.</li>
            <li>Names may be up to 64 characters; control characters are rejected.</li>
            <li>Values may be up to 8,000 characters each; a submission may hold 60 fields.</li>
            <li>Repeated names become an array of values.</li>
            <li>File inputs are not stored in V1 — their parts are skipped.</li>
            <li>Names beginning with <code>_</code> are reserved for the endpoint.</li>
          </ul>
          <CodeBlock lang="bash" filename="curl" code={CURL_EXAMPLE} />
        </Section>

        <Section id="errors" title="Errors">
          <p>Every failure returns a machine-readable code and a request ID.</p>
          <div className="space-y-2">
            {ERROR_CODES.map(([code, status, description]) => (
              <div
                key={code}
                className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <code className="w-44 flex-none text-[12.5px] font-medium text-foreground">
                  {code}
                </code>
                <span className="w-10 flex-none font-mono text-[12px] text-primary">{status}</span>
                <span className="text-[13px] text-muted-foreground">{description}</span>
              </div>
            ))}
          </div>
          <CodeBlock
            lang="http"
            filename="401 Unauthorized"
            code={`{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid form secret.",
    "requestId": "req_31d70c55"
  }
}`}
          />
        </Section>

        <Section id="limits" title="Rate Limits & Size">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Maximum body size: <strong>100 KB</strong>.</li>
            <li>Maximum rate: <strong>60 requests per minute</strong> per IP per form.</li>
            <li>Monthly lead quota follows your plan and is enforced in the database.</li>
            <li>Archived forms return <code>FORM_INACTIVE</code> instead of accepting data.</li>
          </ul>
        </Section>

        <Section id="testing" title="Testing">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Submit your real form once and confirm the success page appears.</li>
            <li>Open Dashboard → Leads — the record should be there within a second.</li>
            <li>Or send the JSON example above with curl and expect a 200.</li>
            <li>Check the request ID in the response against your server logs if not.</li>
          </ol>
          <CodeBlock lang="ts" filename="quick test" code={JSON_EXAMPLE} />
        </Section>

        <Section id="troubleshooting" title="Troubleshooting">
          <div className="space-y-3">
            {[
              ['Nothing appears in Leads', 'The form posts to a different URL, or an input is missing a name attribute. Inspect the network tab and confirm the request goes to /api/f/.'],
              ['404 NOT_FOUND', 'The form ID in the action URL does not match any form. Copy it again from the form page.'],
              ['409 FORM_INACTIVE', 'The form is archived. Reactivate it before testing.'],
              ['429 RATE_LIMITED', 'Wait for the Retry-After interval, then try again.'],
              ['402 QUOTA_EXCEEDED', 'The plan’s monthly lead limit is used. Upgrade or wait for the next calendar month.'],
              ['Redirect goes to the wrong place', '_redirect only accepts same-origin paths such as /thanks.'],
            ].map(([title, body]) => (
              <div key={title}>
                <p className="text-[13px] font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="security" title="Security">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Keep your form secret out of browser code and public repositories.</li>
            <li>Rotate the secret if it may have leaked — old integrations stop immediately.</li>
            <li>Authorization is enforced server-side and by row-level security, never by hidden UI.</li>
            <li>A form ID only routes a submission; it never grants read access to data.</li>
            <li>Submitted values are rendered as text, never executed as markup.</li>
          </ul>
          <Card className="p-4">
            <p className="text-[13px] text-muted-foreground">
              Formivo is a form backend, not a security audit. Review your own handling of
              the data you collect before launch.
            </p>
          </Card>
        </Section>

        <Section id="client-access" title="Client Access">
          <p>
            Invite a client email address to one form from Dashboard → Client Access. The
            invitation is single-use and expires; the client accepts it from their own
            account and then sees a read-only portal for that form alone.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Clients cannot see other forms, settings, billing, or secrets.</li>
            <li>Access is stored per form and enforced by database policies.</li>
            <li>Revoking access takes effect on the next request.</li>
          </ul>
        </Section>

        {/* Previous / next article navigation */}
        <nav className="mt-4 grid gap-3 border-t border-border pt-6 sm:grid-cols-2" aria-label="Documentation pagination">
          <span className="rounded-lg border border-border p-4 opacity-50" aria-disabled="true">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-subtle-foreground">
              <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Previous
            </span>
            <span className="mt-1 block text-[13px] text-muted-foreground">Start of documentation</span>
          </span>
          <a
            href="#html-integration"
            className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <span className="flex items-center justify-end gap-1.5 text-[11px] uppercase tracking-wider text-subtle-foreground">
              Next <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
            <span className="mt-1 block text-right text-[13px] font-medium text-foreground">
              {SECTIONS[currentIndex + 1]?.label}
            </span>
          </a>
        </nav>

        <p className="mt-6 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          Examples above match the deployed endpoint behaviour.
        </p>
      </article>
    </div>
  );
}