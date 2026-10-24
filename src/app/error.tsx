'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side logging is the source of truth; this keeps the failure
    // visible in the browser console without exposing internals to the UI.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="container-page flex h-14 items-center">
          <Link href="/" aria-label="Formivo home">
            <Logo className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <p className="font-mono text-sm text-danger">Error</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred while loading this page. Try again, or
            return to your dashboard.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}