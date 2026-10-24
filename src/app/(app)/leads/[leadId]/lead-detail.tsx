'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from '@/lib/leads';
import { Button, Card, Badge } from '@/components/ui';

interface LeadDetailClientProps {
  lead: {
    id: string;
    workspace_id: string;
    form_id: string;
    data: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    status: LeadStatus;
    created_at: string;
    updated_at: string;
    forms: {
      id: string;
      name: string;
      public_id: string;
      workspace: { id: string; name: string };
    };
  };
}

export function LeadDetailClient({ lead }: LeadDetailClientProps) {
  const [status, setStatus] = useState(lead.status);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatusError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const body = await res.json();
          setStatusError(body.error?.message || 'Failed to update status');
          return;
        }
        setStatus(newStatus);
      } catch {
        setStatusError('Network error. Please try again.');
      }
    });
  };

  // Safely render lead data as text
  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-subtle-foreground">—</span>;
    if (typeof value === 'object') {
      try {
        return <code className="rounded border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[13px]">{JSON.stringify(value)}</code>;
      } catch {
        return <span className="text-subtle-foreground">[object]</span>;
      }
    }
    return String(value);
  };

  // Identify common fields for prominent display
  const primaryFields = ['name', 'full_name', 'email', 'phone', 'company', 'message', 'subject'] as const;
  const primaryData = Object.fromEntries(
    Object.entries(lead.data).filter(([key]) => primaryFields.includes(key as typeof primaryFields[number])),
  );
  const otherData = Object.fromEntries(
    Object.entries(lead.data).filter(([key]) => !primaryFields.includes(key as typeof primaryFields[number])),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <div className="card p-4">
        <Link
          href="/leads"
          className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          ← Back to Leads
        </Link>
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-subtle-foreground">Form</p>
          <p className="font-medium truncate">{lead.forms.name}</p>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-subtle-foreground">Lead ID</p>
          <p className="font-mono text-xs">{lead.id}</p>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-subtle-foreground">Submitted</p>
          <p className="font-medium">
            {new Date(lead.created_at).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="mt-3">
          <p className="text-sm font-medium">Status</p>
          <div className="mt-1 space-y-1">
            {LEAD_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={pending || s === status}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  status === s
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-surface-muted'
                }`}
              >
                {LEAD_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        {statusError && (
          <p className="mt-2 text-sm text-danger">{statusError}</p>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0">
        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Lead Information</h2>
          {primaryData && Object.keys(primaryData).length > 0 && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(primaryData).map(([key, value]) => (
                <div key={key} className="sm:border-b sm:border-border sm:pb-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {key}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{renderValue(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>

        {otherData && Object.keys(otherData).length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold tracking-tight">All Fields</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {Object.entries(otherData).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between border-b border-border pb-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-shrink-0 max-w-[120px]">
                    {key}
                  </dt>
                  <dd className="mt-0.5 text-foreground">{renderValue(value)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        {lead.metadata && Object.keys(lead.metadata).length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold tracking-tight">Metadata</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {Object.entries(lead.metadata).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between border-b border-border pb-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</dt>
                  <dd className="mt-0.5 text-foreground">{renderValue(value)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Activity</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{new Date(lead.created_at).toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="font-medium">{new Date(lead.updated_at).toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Current Status</dt>
              <dd>
                <Badge>{LEAD_STATUS_LABELS[status]}</Badge>
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
