'use client';

import { Suspense, useState, useTransition } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Input, Label, Button } from '@/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const confirmed = searchParams.get('confirmed');
  const authError = searchParams.get('error');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(
          error.message === 'Email not confirmed'
            ? 'Please confirm your email first — check your inbox for the confirmation link.'
            : error.message,
        );
        return;
      }

      router.push('/dashboard');
      router.refresh();
    });
  };

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Sign in to Formivo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back — your leads are waiting.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!error && registered && (
        <p className="mt-4 rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          Email confirmed — you can sign in now.
        </p>
      )}

      {!error && confirmed && (
        <p className="mt-4 rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          Your account is confirmed. Please sign in.
        </p>
      )}

      {!error && !registered && !confirmed && authError && (
        <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          Something went wrong while signing you in. Please try again.
        </p>
      )}

      <form className="mt-7 space-y-4" onSubmit={handleSignIn}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
          />
        </div>
        <div className="flex justify-between text-sm">
          <a
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </a>
          <a
            href="/sign-up"
            className="text-link font-medium hover:underline"
          >
            Create account
          </a>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
