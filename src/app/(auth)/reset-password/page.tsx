'use client';

import { useState, useTransition } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Input, Label, Button } from '@/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      router.push('/sign-in?reset=success');
    });
  };

  if (success) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Password updated</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Password changed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your password has been updated successfully.
        </p>
        <div className="mt-7">
          <Button onClick={() => router.push('/sign-in')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-primary">Reset password</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Create a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your new password must be at least 8 characters.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form className="mt-7 space-y-4" onSubmit={handleReset}>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
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
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your new password"
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending || !password.trim() || !confirm.trim()}>
          {pending ? 'Updating...' : 'Update Password'}
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
