'use client';

import { useState, useTransition } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Input, Label, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    });
  };

  if (success) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Reset password</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a password reset link to <strong>{email}</strong>.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Click the link in the email to set a new password.
        </p>
        <div className="mt-7">
          <Button variant="secondary" onClick={() => router.push('/sign-in')}>
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-primary">Reset password</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
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
        <Button type="submit" className="w-full" disabled={pending || !email.trim()}>
          {pending ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <a href="/sign-in" className="text-link font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
