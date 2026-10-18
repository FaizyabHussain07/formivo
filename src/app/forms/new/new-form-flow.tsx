'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label, Badge } from '@/components/ui';
import { createFormAction } from './actions';

type Step = 'choose' | 'name' | 'secret';

interface CreatedForm {
  publicId: string;
  secret: string;
  endpoint: string;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-xs">
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
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

export function NewFormFlow() {
  const [step, setStep] = useState<Step>('choose');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<CreatedForm | null>(null);
  const [secretRevealed, setSecretRevealed] = useState(false);
  const router = useRouter();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createFormAction(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreated({ publicId: result.publicId, secret: result.secret, endpoint: result.endpoint });
      setStep('secret');
    });
  };

  // ── Step 3: secret shown exactly once ──────────────────────────────
  if (step === 'secret' && created) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-soft text-success">✓</span>
            <h1 className="text-lg font-semibold tracking-tight">Form created</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Your endpoint and secret are ready. Copy the secret now — it is
            shown only once and cannot be retrieved later.
          </p>

          <div className="mt-5 space-y-4">
            <CopyRow label="Endpoint" value={`POST ${created.endpoint}`} />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Secret</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-xs">
                  {secretRevealed ? created.secret : '•'.repeat(48)}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSecretRevealed((v) => !v)}
                >
                  {secretRevealed ? 'Hide' : 'Reveal'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(created.secret);
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
              Keep this secret on your server. Never commit it to a public
              repository — anyone with it can submit leads to your form.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => {              router.push(`/forms/${created.publicId}`);
              }}
            >
              Go to Dashboard
            </Button>
            <Link href="/docs">
              <Button variant="secondary">Read integration docs</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ── Step 2: form name ──────────────────────────────────────────────
  if (step === 'name') {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Connect Custom Form
          </p>
          <h1 className="mt-2 text-lg font-semibold tracking-tight">Name your form</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This is internal — you can change it later.
          </p>

          {error && (
            <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="form-name">Form name</Label>
              <Input
                id="form-name"
                type="text"
                required
                maxLength={100}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Contact Form"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? 'Creating...' : 'Create Form'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep('choose')}
                disabled={pending}
              >
                Back
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ── Step 1: option picker (PRD §18) ────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6">
        <h1 className="text-lg font-semibold tracking-tight">Create a form</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you want to connect your form.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setStep('name')}
            className="rounded-lg border border-primary/40 bg-primary/5 p-5 text-left transition-colors hover:bg-primary/10"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">Connect Custom Form</p>
              <Badge className="border-primary/25 bg-primary/10 text-primary">
                Available
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Send submissions from your existing website form to a Formivo
              endpoint. No rebuild required.
            </p>
          </button>

          <div className="cursor-not-allowed rounded-lg border border-border bg-surface-muted p-5 opacity-70">
            <div className="flex items-center justify-between">
              <p className="font-medium">Embedded Form Builder</p>
              <Badge>Coming Soon</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Build and embed forms directly in Formivo. Not available in V1.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Cancel
          </Link>
        </div>
      </Card>
    </div>
  );
}


