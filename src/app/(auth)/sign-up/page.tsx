'use client';

import { useState, useTransition } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Input, Label, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingEmail, setConfirmingEmail] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setError(error.message);
        return;
      }

      // Auto-confirmation disabled → user must confirm via email first.
      if (!data.session) {
        setConfirmingEmail(email);
        return;
      }

      // Confirmed immediately (auto-confirm enabled) → go create workspace.
      router.push('/onboarding');
      router.refresh();
    });
  };

  // ── Email confirmation popup ───────────────────────────────────────
  if (confirmingEmail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-email-title"
          className="card w-full max-w-md p-6 shadow-md"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>

          <h2
            id="confirm-email-title"
            className="mt-4 text-center text-lg font-semibold tracking-tight"
          >
            Confirm your email
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            We sent a confirmation link to
          </p>
          <p className="mt-1 text-center text-sm font-medium">{confirmingEmail}</p>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Open the email in your inbox (Gmail, etc.) and click the link to
            activate your account. Then come back here to sign in.
          </p>

          <div className="mt-6 space-y-2">
            <a
              href={`https://mail.google.com/mail/u/0`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full">Open Gmail</Button>
            </a>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setConfirmingEmail(null);
                router.push('/sign-in?registered=true');
              }}
            >
              Go to Sign In
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-subtle-foreground">
            Didn&apos;t get it? Check spam, or{' '}
            <button
              type="button"
              className="underline hover:text-muted-foreground"
              onClick={() => setConfirmingEmail(null)}
            >
              use a different email
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  // ── Sign-up form ───────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start free — connect your first form in minutes.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form className="mt-7 space-y-4" onSubmit={handleSignUp}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          By creating an account, you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/sign-in" className="text-link font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
