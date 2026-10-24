'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

/**
 * The only control that consumes an invitation. Kept client-side so accepting
 * is always an explicit user action — opening the link never accepts it.
 */
export function AcceptInvitationButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const accept = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.success) {
          setError(json?.error?.message ?? 'The invitation could not be accepted. Please try again.');
          return;
        }

        router.push(json.redirectUrl);
        router.refresh();
      } catch {
        setError('The invitation could not be accepted. Check your connection and try again.');
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button className="w-full" onClick={accept} disabled={pending}>
        {pending ? 'Accepting...' : 'Accept Invitation'}
      </Button>
    </div>
  );
}