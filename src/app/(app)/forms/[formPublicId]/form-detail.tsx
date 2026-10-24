'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { Button, Card, CopyField, Tabs } from '@/components/ui';
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
  const { toast } = useToast();

  const endpoint = `${PROD}/api/f/${form.public_id}`;

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
                <div className="grid gap-4 sm:grid-cols-2">
                  <CopyField label="Content-Type" value="application/x-www-form-urlencoded" />
                  <CopyField label="Method" value="POST" />
                </div>
                <p className="text-[13px] text-muted-foreground">
                  Add an optional hidden <code className="rounded border border-border bg-surface-muted px-1 font-mono text-[12px]">_redirect</code>{' '}
                  field to send the visitor to a same-origin thank-you page after submit.
                </p>
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
