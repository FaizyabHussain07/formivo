'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, ConfirmDialog, Input, Label } from '@/components/ui';

export type PendingInvitation = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
};

export type AccessRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  granted_at: string;
};

type ActionTarget =
  | { kind: 'invite'; id: string; email: string }
  | { kind: 'access'; id: string; email: string }
  | null;

export function ClientAccessPanel({
  formPublicId,
  formName,
  invitations,
  access,
}: {
  formPublicId: string;
  formName: string;
  invitations: PendingInvitation[];
  access: AccessRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [invitePending, startInvite] = useTransition();
  const [actionPending, setActionPending] = useState(false);
  const [target, setTarget] = useState<ActionTarget>(null);

  const submitInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    startInvite(async () => {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formPublicId, email }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setNotice({ tone: 'error', text: data?.error?.message ?? 'Could not send the invitation.' });
        return;
      }

      setEmail('');
      setNotice({ tone: 'ok', text: `Invitation sent to ${email}.` });
      router.refresh();
    });
  };

  const runAction = async () => {
    if (!target) return;
    setActionPending(true);
    setNotice(null);

    try {
      const res =
        target.kind === 'invite'
          ? await fetch(`/api/invitations/${target.id}`, { method: 'DELETE' })
          : await fetch(`/api/client-access/${target.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setNotice({ tone: 'error', text: data?.error?.message ?? 'That action could not be completed.' });
        return;
      }

      setNotice({
        tone: 'ok',
        text:
          target.kind === 'invite'
            ? `Invitation for ${target.email} revoked.`
            : `Access for ${target.email} revoked.`,
      });
      router.refresh();
    } catch {
      setNotice({ tone: 'error', text: 'That action could not be completed. Check your connection.' });
    } finally {
      setActionPending(false);
      setTarget(null);
    }
  };

  const resend = async (invitation: PendingInvitation) => {
    setNotice(null);
    const res = await fetch(`/api/invitations/${invitation.id}`, { method: 'PATCH' });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setNotice({ tone: 'error', text: data?.error?.message ?? 'Could not resend the invitation.' });
      return;
    }
    setNotice({ tone: 'ok', text: `Invitation resent to ${invitation.email}.` });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submitInvite} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="client-email">Client email</Label>
            <Input
              id="client-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={invitePending}>
            {invitePending ? 'Sending...' : 'Invite Client'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The invitation is read-only and limited to <strong>{formName}</strong>. It
          does not grant access to other forms, workspace settings, or billing.
        </p>
      </form>

      {notice && (
        <p
          role="status"
          className={`rounded-md px-3 py-2 text-sm ${
            notice.tone === 'ok'
              ? 'bg-success-soft text-success'
              : 'bg-danger-soft text-danger'
          }`}
        >
          {notice.text}
        </p>
      )}

      <section aria-labelledby="pending-invitations">
        <h3 id="pending-invitations" className="text-sm font-semibold">
          Pending invitations
        </h3>
        {invitations.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No invitations are waiting to be accepted.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Expires{' '}
                    {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Pending</Badge>
                  <Button variant="secondary" size="sm" onClick={() => resend(invitation)}>
                    Resend
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setTarget({ kind: 'invite', id: invitation.id, email: invitation.email })
                    }
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="active-access">
        <h3 id="active-access" className="text-sm font-semibold">
          Active client access
        </h3>
        {access.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No client has accepted an invitation to this form yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {access.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.email ?? row.id}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.full_name ? `${row.full_name} · ` : ''}Granted{' '}
                    {new Date(row.granted_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Viewer</Badge>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setTarget({ kind: 'access', id: row.id, email: row.email ?? 'this client' })
                    }
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={runAction}
        pending={actionPending}
        title={target?.kind === 'invite' ? 'Revoke invitation?' : 'Revoke client access?'}
        description={
          target?.kind === 'invite'
            ? `The invitation link for ${target.email} will stop working immediately.`
            : `${target?.email ?? 'This client'} will immediately lose access to ${formName}'s submissions. Their account and other shared forms are unaffected.`
        }
        confirmLabel="Revoke access"
      />
    </div>
  );
}