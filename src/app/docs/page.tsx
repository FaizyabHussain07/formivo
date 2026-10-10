import { MarketingHeader, MarketingFooter } from "@/components/marketing";
import { CodeBlock, Card } from "@/components/ui";

export const metadata = { title: "Documentation" };

const jsExample = `await fetch("https://app.formivo.com/api/v1/forms/form_abc123/submissions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer FORM_SECRET",
  },
  body: JSON.stringify({
    data: {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello",
    },
  }),
});

// → { "success": true, "leadId": "lead_123", "message": "Submission received." }`;

const curlExample = `curl -X POST "https://app.formivo.com/api/v1/forms/form_abc123/submissions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer FORM_SECRET" \\
  -d '{"data":{"name":"John Doe","email":"john@example.com"}}'`;

const errorCodes: Array<[string, string]> = [
  ["INVALID_REQUEST", "The request body is malformed or missing a data object."],
  ["UNAUTHORIZED", "Missing or invalid Bearer secret."],
  ["FORM_NOT_FOUND", "No form exists for the given public form ID."],
  ["FORM_INACTIVE", "The form is archived and no longer accepts submissions."],
  ["PAYLOAD_TOO_LARGE", "The request body exceeds the allowed size."],
  ["RATE_LIMITED", "Too many requests. Slow down and retry."],
  ["QUOTA_EXCEEDED", "The monthly lead limit for the plan has been reached."],
  ["INTERNAL_ERROR", "Something went wrong on our side. Try again."],
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
    <section id={id} className="scroll-mt-20 border-t border-border py-10 first:border-t-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-muted-foreground [&_code]:rounded [&_code]:border [&_code]:border-border [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-foreground [&_p]:max-w-2xl">
        {children}
      </div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <nav className="sticky top-20 space-y-1 text-sm">
              {[
                ["intro", "Introduction"],
                ["quick-start", "Quick Start"],
                ["authentication", "Authentication"],
                ["request-format", "Request Format"],
                ["errors", "Errors"],
                ["testing", "Testing"],
                ["security", "Security"],
              ].map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Formivo API Documentation
            </h1>

            <Section id="intro" title="Introduction">
              <p>
                Formivo turns submissions from your existing website form into leads in your
                dashboard. You don&apos;t rebuild your form — you point it at your Formivo
                endpoint and authenticate with your form secret.
              </p>
            </Section>

            <Section id="quick-start" title="Quick Start">
              <ol className="list-decimal space-y-1 pl-5">
                <li>Create a form in your Formivo dashboard.</li>
                <li>Copy the endpoint URL and form secret.</li>
                <li>Submit data to the endpoint.</li>
                <li>Open your dashboard — the submission appears as a lead.</li>
              </ol>
              <div className="mt-4">
                <CodeBlock>{jsExample}</CodeBlock>
              </div>
            </Section>

            <Section id="authentication" title="Authentication">
              <p>
                Every submission request must include your form secret as a Bearer token.
                Secrets are shown once at creation and can be rotated in the dashboard.
              </p>
              <div className="mt-4">
                <CodeBlock>{"Authorization: Bearer FORM_SECRET"}</CodeBlock>
              </div>
              <p>
                Keep the secret on your server when possible. A secret placed in
                browser-side JavaScript is visible to anyone using your site.
              </p>
            </Section>

            <Section id="request-format" title="Request Format">
              <p className="mt-3">
                Send a JSON object with a <code>data</code> field containing your form values.
                Any JSON shape is accepted — Formivo does not force a rigid field schema.
                An optional <code>metadata</code> object is stored alongside the lead.
              </p>
              <div className="mt-4">
                <CodeBlock>{curlExample}</CodeBlock>
              </div>
            </Section>

            <Section id="errors" title="Errors">
              <p>
                Errors return structured JSON with a machine-readable code:
              </p>
              <div className="mt-4 space-y-2">
                {errorCodes.map(([code, desc]) => (
                  <div
                    key={code}
                    className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <code className="text-[12.5px] font-medium">{code}</code>
                    <span className="text-[13px] text-muted-foreground sm:max-w-sm sm:text-right">
                      {desc}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="testing" title="Testing">
              <p>
                Use the <strong>Test submission</strong> tool on your form&apos;s integration
                page to verify the connection without touching your live site. You can also
                send a real request with curl and expect the lead to appear within seconds.
              </p>
            </Section>

            <Section id="security" title="Security">
              <ul className="list-disc space-y-1 pl-5">
                <li>Never commit your form secret to a public repository.</li>
                <li>Rotate your secret if it may have leaked — old integrations stop working immediately.</li>
                <li>All authorization is enforced server-side; browser checks are cosmetic.</li>
              </ul>
            </Section>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
