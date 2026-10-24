'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Button, Callout, Field, Input, LinkButton, PasswordInput } from '@/components/ui';
import { humaniseAuthError, safeNextPath } from '@/lib/auth-errors';
import { Logo } from '@/components/logo';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  /* Invitation links pass ?next= so the client lands back on acceptance. */
  const next = searchParams.get('next');
  const nextHref = safeNextPath(next, '/dashboard');
  const inviteHref = safeNextPath(next, '/dashboard');
  const authQuery = inviteHref === '/dashboard' ? '' : `?next=${encodeURIComponent(inviteHref)}`;

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!EMAIL_RE.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin.replace(/\/$/, '')
          : 'https://formivo.faizyab.me';
      const callback = `${origin}/auth/callback?next=${encodeURIComponent(nextHref)}`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callback },
      });

      if (error) {
        setFormError(humaniseAuthError(error.message));
        return;
      }

      // Auto-confirm disabled → the user must verify their email first.
      if (!data.session) {
        setAwaitingEmail(email.trim());
        return;
      }

      router.push(nextHref === '/dashboard' ? '/onboarding' : nextHref);
      router.refresh();
    });
  };

  if (awaitingEmail) {
    return (
      <div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
          <Mail className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Confirm your email
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a verification link to{' '}
          <span className="font-medium text-foreground">{awaitingEmail}</span>.
        </p>
        <div className="mt-5">
          <Callout tone="info">
            Open the link in that email to activate your account, then sign in.
            Didn&apos;t get it? Check spam, or try again with another address.
          </Callout>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <LinkButton href={`/sign-in${authQuery}`} className="w-full">
            Go to sign in
          </LinkButton>
          <button
            type="button"
            onClick={() => setAwaitingEmail(null)}
            className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Logo variant="wordmark" className="mb-6" />
      <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start free — connect your first form in minutes.
      </p>

      {formError && (
        <div className="mt-4">
          <Callout tone="danger">{formError}</Callout>
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <Field
          htmlFor="email"
          label="Email"
          error={errors.email}
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </Field>

        <Field
          htmlFor="password"
          label="Password"
          error={errors.password}
          hint={!errors.password ? 'At least 8 characters.' : undefined}
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
        </Field>

        <p className="text-xs text-muted-foreground">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="text-primary underline underline-offset-2 hover:text-primary-hover">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary underline underline-offset-2 hover:text-primary-hover">
            Privacy Policy
          </Link>
          .
        </p>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={`/sign-in${authQuery}`}
          className="font-medium text-primary underline underline-offset-4 hover:text-primary-hover"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}