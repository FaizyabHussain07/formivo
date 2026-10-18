'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rotateFormSecretAction } from './actions';
import { Button, Card, CodeBlock } from '@/components/ui';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-xs text-foreground">
        {value}
      </code>
      <Button
        variant="secondary"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied' : label}
      </Button>
    </div>
  );
}

interface FormDetailPageProps {
  form: {
    id: string;
    public_id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    workspace_id: string;
  };
}

export function FormDetailPage({ form }: FormDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'settings'>('overview');
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [rotateResult, setRotateResult] = useState<{ secret: string } | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotatePending, startRotateTransition] = useTransition();
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testPending, startTestTransition] = useTransition();
  const router = useRouter();

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const endpoint = `${appUrl}/api/v1/forms/${form.public_id}/submissions`;

  const handleRotateSecret = () => {
    startRotateTransition(async () => {
      setRotateError(null);
      const result = await rotateFormSecretAction(form.public_id);
      if (!result.ok) {
        setRotateError(result.error);
        return;
      }
      setRotateResult({ secret: result.secret });
      setSecretRevealed(true);
      router.refresh();
    });
  };

  const handleTestSubmission = async () => {
    setTestError(null);
    setTestSuccess(null);
    startTestTransition(async () => {
      try {
        const secret = prompt('Enter your form secret to test:', '');
        if (!secret) return;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({
            data: {
              name: 'Test Submission',
              email: 'test@example.com',
              message: 'This is a test submission from the Formivo dashboard.',
            },
            metadata: {
              source: 'dashboard-test',
              testedAt: new Date().toISOString(),
            },
          }),
        });

        const result = await res.json();
        if (result.success) {
          setTestSuccess(`Submission received! Lead ID: ${result.leadId}`);
          router.refresh();
        } else {
          setTestError(result.error?.message || 'Test submission failed');
        }
      } catch (err) {
        setTestError(
          err instanceof Error ? err.message : 'Failed to send test submission',
        );
      }
    });
  };

  const currentSecret = rotateResult?.secret ?? form.public_id;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar tabs */}
      <div className="card p-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'leads', label: 'Leads' },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`w-full rounded-md px-3 py-2 text-sm text-left transition-colors ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-w-0">
        {activeTab === 'overview' && (
          <>
            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Form Overview</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Form ID</dt>
                  <dd className="font-mono text-xs">{form.public_id}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="capitalize">{form.status}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="font-medium">
                    {new Date(form.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
                {form.description && (
                  <div className="flex items-start justify-between border-b border-border pb-3">
                    <dt className="text-muted-foreground pt-1">Description</dt>
                    <dd className="mt-1 text-sm">{form.description}</dd>
                  </div>
                )}
              </dl>
            </Card>

            {/* Integration credentials */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Integration</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your existing website form to this endpoint. Each valid submission
                becomes a lead in your dashboard.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Endpoint</p>
                  <CopyButton label="Copy" value={`POST ${endpoint}`} />
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">Content-Type</p>
                  <CopyButton label="Copy" value="application/json" />
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">Authorization Header</p>
                  <CopyButton label="Copy" value={`Bearer ${currentSecret}`} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {secretRevealed
                      ? 'Your secret is visible. Keep it secure.'
                      : 'Click to reveal your secret.'}
                  </p>
                </div>
              </div>

              {!secretRevealed && (
                <div className="mt-4 rounded-md border border-warning/30 bg-warning-soft/50 px-3 py-2 text-xs text-warning">
                  Your integration secret is hidden. Reveal it to see and copy the value.
                </div>
              )}
            </Card>

            {/* Request example */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Request Example</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Send a JSON payload with a required <code>data</code> object containing your
                form fields. An optional <code>metadata</code> object can include context like
                the source page.
              </p>
              <div className="mt-4 rounded-md border border-border bg-surface-muted p-4">
                <CopyButton
                  label="Copy"
                  value={JSON.stringify(
                    {
                      data: {
                        name: 'John Doe',
                        email: 'john@example.com',
                        message: 'I would like to know more about your services.',
                      },
                      metadata: {
                        source: 'contact-page',
                        page: '/contact',
                      },
                    },
                    null,
                    2,
                  )}
                />
              </div>
            </Card>

            {/* Test submission */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Test Submission</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Verify your integration by sending a test submission. You will need your form
                secret.
              </p>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleTestSubmission}
                  disabled={testPending}
                >
                  {testPending ? 'Sending...' : 'Send Test Submission'}
                </Button>
              </div>
              {testError && (
                <div className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                  {testError}
                </div>
              )}
              {testSuccess && (
                <div className="mt-3 rounded-md bg-success-soft px-3 py-2 text-sm text-success">
                  {testSuccess}
                </div>
              )}
            </Card>

            {/* Security guidance */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Security Guidance</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-none text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Keep your form secret on your server whenever possible. Do not expose it in browser-side JavaScript unless you understand the security implications.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-none text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Rotate your secret if it may have leaked. Old integrations stop working immediately after rotation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-none text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>All authorization is enforced server-side. Never rely on hidden UI or client-side checks alone.</span>
                </li>
              </ul>
            </Card>
          </>
        )}

        {activeTab === 'leads' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold tracking-tight">Leads</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              View and manage leads from this form.
            </p>
            <div className="mt-4">
              <a
                href={`/leads?form=${form.public_id}`}
                className="text-link font-medium hover:underline"
              >
                Go to Leads →
              </a>
            </div>
          </Card>
        )}

        {activeTab === 'settings' && (
          <>
            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Form Settings</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Form Name</dt>
                  <dd className="font-medium max-w-xs truncate">{form.name}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Public ID</dt>
                  <dd className="font-mono text-xs">{form.public_id}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="capitalize">{form.status}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Integration Secret</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your form secret authenticates submissions. It is shown only once when the form
                is created. You can rotate it to generate a new secret.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setSecretRevealed((v) => !v)}
                >
                  {secretRevealed ? 'Hide Secret' : 'Reveal Secret'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={!secretRevealed}
                  onClick={handleRotateSecret}
                >
                  {rotatePending ? 'Rotating...' : 'Rotate Secret'}
                </Button>
              </div>
              {rotateError && (
                <div className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                  {rotateError}
                </div>
              )}
              {secretRevealed && (
                <div className="mt-3 rounded-md border border-border bg-surface-muted px-3 py-2">
                  <code className="font-mono text-xs text-foreground">
                    {currentSecret}
                  </code>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Secret is visible. Copy it now.
                  </p>
                </div>
              )}
              <div className="mt-4 rounded-md border border-warning/30 bg-warning-soft/50 px-3 py-2 text-sm text-warning">
                <strong>Warning:</strong> Rotating the secret will immediately invalidate the
                current secret. Any integrations using the old secret will stop working.
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">Form Actions</h2>
              <div className="mt-4 space-y-2">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => setActiveTab('overview')}
                >
                  ← Back to Overview
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
