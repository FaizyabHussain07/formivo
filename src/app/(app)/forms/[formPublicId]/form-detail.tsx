'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Copy, ExternalLink, RefreshCw, Send } from 'lucide-react';
import { rotateFormSecretAction } from './actions';
import { Button, Callout, Card, CopyField, Input, Label, Tabs } from '@/components/ui';
import { CodeBlock } from '@/components/code';
import { useToast } from '@/components/toast';
import { PRODUCTION_URL } from '@/lib/app-config';

/* Endpoint URLs a developer copies always use the production domain,
   no matter where the dashboard itself is served from. */
const PROD = PRODUCTION_URL;

interface FormDetailProps {
  form: {
    id: string;
    public_id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    leadCount: number;
    recentLeads: Array<{ id: string; created_at: string; preview: string }>;
  };
}

const htmlSample = (formId: string) =>
  `<form action="${PROD}/api/f/${formId}" method="POST">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message"></textarea>
  <button type="submit">Send Message</button>
</form>`;

/**
 * Form detail — the page a developer lands on after creating a connection.
 * Primary job: verify submissions are arriving and make the endpoint trivial
 * to copy into an existing form.
 */
export function FormDetail({ form }: FormDetailProps) {
  const [tab, setTab] = useState<'overview' | 'integration' | 'settings'>('overview');
  const [secret, setSecret] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rotateResult, setRotateResult] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotatePending, startRotate] = useTransition();
  const [testPending, startTest] = useTransition();
  const [testResult, setTestResult] = useState<
    { ok: boolean; message: string; id?: string } | null
  >(null);
  const [testToken, setTestToken] = useState('');
  const { toast } = useToast();

  const router = useRouter();
  const endpoint = `${PROD}/api/f/${form.public_id}`;
  const displaySecret = rotateResult ?? secret;

  const handleRotate = () => {
    setRotateError(null);
    startRotate(async () => {
      const result = await rotateFormSecretAction(form.public_id);
      if (!result.ok) {
        setRotateError(result.error);
        return;
      }
      setRotateResult(result.secret);
      setSecret(result.secret);
      setRevealed(true);
      toast({
        title: 'Secret rotated',
        description: 'The previous secret stopped working immediately.',
        variant: 'success',
      });
      router.refresh();
    });
  };

  const handleTest = () => {
    if (!testToken.trim()) {
      toast({
        title: 'Secret required',
        description: 'Paste your form secret to send a JSON API test.',
        variant: 'error',
      });
      return;
    }
    setTestResult(null);
    startTest(async () => {
      try {
        const res = await fetch(`/api/v1/forms/${form.public_id}/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testToken.trim()}`,
          },
          body: JSON.stringify({
            data: {
              name: 'Test Submission',
              email: 'test@example.com',
              message: 'Sent from the Formivo form page.',
            },
            metadata: { source: 'dashboard-test' },
          }),
        });
        const body = await res.json();
        if (body.success) {
          setTestResult({
            ok: true,
            message: 'Submission received.',
            id: body.leadId,
          });
          router.refresh();
        } else {
          setTestResult({
            ok: false,
            message: body.error?.message ?? 'The test submission failed.',
          });
        }
      } catch {
        setTestResult({ ok: false, message: 'Network error — please try again.' });
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 lg:px-8 lg:py-8">
      {/* Endpoint summary — always visible, the main thing you came here for */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Endpoint</p>
            <code className="mt-1.5 block break-all font-mono text-[13px] text-foreground">
              <span className="text-primary">POST</span> {endpoint}
            </code>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(endpoint);
                toast({ title: 'Endpoint copied', variant: 'success' });
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy endpoint
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setTab('integration')}>
              Integration guide
            </Button>
            <Link href={`/leads?form=${form.public_id}`}>
              <Button size="sm">
                View leads
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Tabs
        className="mt-6"
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'integration', label: 'Integration' },
          { id: 'settings', label: 'Settings' },
        ]}
      />

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Total leads</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {form.leadCount}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="mt-2 text-[15px] font-medium capitalize">{form.status}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="mt-2 text-[15px] font-medium">
                  {new Date(form.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </Card>
            </div>

            <Card>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">Recent submissions</h2>
                <Link
                  href={`/leads?form=${form.public_id}`}
                  className="text-[13px] text-primary transition-colors hover:text-primary-hover"
                >
                  View all →
                </Link>
              </div>
              {form.recentLeads.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[15px] font-semibold">No submissions yet</p>
                  <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
                    Submit your live form once — the record appears here within a second.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {form.recentLeads.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-surface-muted"
                      >
                        <span className="min-w-0 truncate text-[13px] text-foreground">
                          {lead.preview}
                        </span>
                        <span className="flex-none text-[12px] text-subtle-foreground">
                          {new Date(lead.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">Quick integration</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  A plain HTML form with only an action attribute — no SDK required.
                </p>
              </div>
              <div className="p-5">
                <CodeBlock lang="html" filename="index.html" code={htmlSample(form.public_id)} />
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                  <Link
                    href="/docs#html-integration"
                    className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary-hover"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Full integration docs
                  </Link>
                  <span className="text-subtle-foreground">·</span>
                  <span>
                    Field names and values are preserved exactly as submitted.
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'integration' && (
          <div className="space-y-6">
            <Card>
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">HTML form</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Works with standard browser submissions — urlencoded and multipart both
                  supported.
                </p>
              </div>
              <div className="space-y-4 p-5">
                <CopyField label="Endpoint" value={endpoint} prefix="POST" />
                <CodeBlock lang="html" filename="index.html" code={htmlSample(form.public_id)} />
                <p className="text-[13px] text-muted-foreground">
                  Add an optional hidden <code className="rounded border border-border bg-surface-muted px-1 font-mono text-[12px]">_redirect</code>{' '}
                  field to send the visitor to a same-origin thank-you page after submit.
                </p>
              </div>
            </Card>

            <Card>
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">JSON API (server-side)</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Authenticate with your form secret. Keep it on your server.
                </p>
              </div>
              <div className="space-y-4 p-5">
                <CodeBlock
                  lang="ts"
                  filename="server call"
                  code={`await fetch("${PROD}/api/v1/forms/${form.public_id}/submissions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_FORM_SECRET"
  },
  body: JSON.stringify({
    data: { name: "John Doe", email: "john@example.com" }
  })
});`}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <CopyField label="Content-Type" value="application/json" />
                  <CopyField label="Method" value="POST" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">Send a test submission</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Uses the JSON API — paste your form secret to verify the connection.
                </p>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <Label htmlFor="test-secret">Form secret</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <Input
                      id="test-secret"
                      type="password"
                      className="max-w-md flex-1"
                      placeholder="fmv_..."
                      value={testToken}
                      onChange={(e) => setTestToken(e.target.value)}
                      autoComplete="off"
                    />
                    <Button onClick={handleTest} disabled={testPending}>
                      {testPending ? (
                        'Sending…'
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          Send test
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    HTML forms do not need the secret — this tests the authenticated JSON
                    endpoint only.
                  </p>
                </div>

                {testResult && (
                  <Callout tone={testResult.ok ? 'success' : 'danger'}>
                    {testResult.ok ? (
                      <>
                        Submission received.
                        {testResult.id && (
                          <>
                            {' '}
                            Lead ID:{' '}
                            <code className="font-mono">{testResult.id}</code> — it is in your
                            leads list now.
                          </>
                        )}
                      </>
                    ) : (
                      testResult.message
                    )}
                  </Callout>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">Form details</h2>
              </div>
              <dl className="divide-y divide-border">
                {[
                  ['Name', form.name],
                  ['Description', form.description ?? '—'],
                  ['Form ID', form.public_id],
                  ['Status', form.status === 'active' ? 'Active' : 'Archived'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-6 px-5 py-3.5">
                    <dt className="text-[13px] text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 max-w-xs truncate text-right text-[13px] font-medium text-foreground">
                      {label === 'Form ID' ? (
                        <code className="font-mono">{value}</code>
                      ) : (
                        String(value)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card>
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">Form secret</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Only used by the JSON API. Stored as a hash — we cannot show it again.
                </p>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRevealed((v) => !v)}
                    disabled={!displaySecret}
                  >
                    {revealed ? 'Hide secret' : 'Reveal secret'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!displaySecret) return;
                      await navigator.clipboard.writeText(displaySecret);
                      toast({ title: 'Secret copied', variant: 'success' });
                    }}
                    disabled={!displaySecret}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRotate}
                    disabled={rotatePending}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {rotatePending ? 'Rotating…' : 'Rotate secret'}
                  </Button>
                </div>

                {displaySecret ? (
                  <code className="block break-all rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-xs">
                    {revealed ? displaySecret : '•'.repeat(48)}
                  </code>
                ) : (
                  <p className="text-[13px] text-muted-foreground">
                    The current secret is not available here. Rotate it to generate a new
                    one — the new value is shown exactly once.
                  </p>
                )}

                {rotateError && <Callout tone="danger">{rotateError}</Callout>}

                <Callout tone="warning">
                  Rotating invalidates the current secret immediately. Any integration still
                  using it will start returning 401.
                </Callout>
              </div>
            </Card>

            <Card>
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold">Client access</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Give a client a read-only view of this form alone.
                </p>
              </div>
              <div className="p-5">
                <Link href={`/forms/${form.public_id}/clients`}>
                  <Button variant="secondary">
                    Manage client access
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="border-warning/30">
              <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warning" aria-hidden="true" />
                <div>
                  <h2 className="text-[15px] font-semibold">Archiving</h2>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    An archived form stops accepting submissions immediately. Existing leads
                    are kept.
                  </p>
                </div>
              </div>
              <div className="p-5">
                <Button
                  variant="danger"
                  onClick={async () => {
                    toast({
                      title: 'Archiving from the dashboard',
                      description:
                        'Archiving is available from the Forms list. It will be wired to this page next.',
                      variant: 'info',
                    });
                  }}
                >
                  {form.status === 'active' ? 'Archive form' : 'Form is archived'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export { Check };
