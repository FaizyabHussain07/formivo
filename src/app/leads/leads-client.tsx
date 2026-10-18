'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LEAD_STATUS_LABELS, type LeadStatus } from '@/lib/leads';
import Link from 'next/link';
import { Card, LeadStatusBadge } from '@/components/ui';

interface LeadsClientProps {
  leads: Array<{
    id: string;
    data: Record<string, unknown> | null;
    status: string;
    created_at: string;
    forms: { name: string; public_id: string } | null;
  }>;
  forms: Array<{ id: string; public_id: string; name: string; status: string }>;
  search: string;
  statusFilter: string;
  formFilter: string;
  page: number;
  total: number;
  limit: number;
  hasNext: boolean;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: LEAD_STATUS_LABELS.new },
  { value: 'contacted', label: LEAD_STATUS_LABELS.contacted },
  { value: 'qualified', label: LEAD_STATUS_LABELS.qualified },
  { value: 'converted', label: LEAD_STATUS_LABELS.converted },
  { value: 'archived', label: LEAD_STATUS_LABELS.archived },
];

export function LeadsClient({
  leads,
  forms,
  search,
  statusFilter,
  formFilter,
  page,
  total,
  limit,
  hasNext,
}: LeadsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState(search);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/leads?${params.toString()}`, { scroll: false });
  };

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    updateParam('search', value);
  };

  if (leads.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-[15px] font-semibold">
            {search || statusFilter || formFilter ? 'No matching leads' : 'No leads yet'}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {search || statusFilter || formFilter
              ? 'Try adjusting your search or filters.'
              : 'Once your form receives a submission, it will appear here.'}
          </p>
          {(search || statusFilter || formFilter) && (
            <button
              onClick={() => {
                setLocalSearch('');
                router.push('/leads', { scroll: false });
              }}
              className="mt-4 text-sm text-link hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <input
            type="search"
            placeholder="Search leads..."
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus:border-ring focus:outline-none"
          />
          <svg
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => updateParam('status', e.target.value)}
          className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground focus:border-ring focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={formFilter}
          onChange={(e) => updateParam('form', e.target.value)}
          className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground focus:border-ring focus:outline-none"
        >
          <option value="">All forms</option>
          {forms.map((f) => (
            <option key={f.id} value={f.public_id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? 'lead' : 'leads'}
        {search && ` matching "${search}"`}
      </p>

      {/* Leads list */}
      <div className="space-y-2">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/leads/${lead.id}`}
            className="block rounded-md border border-border p-4 transition-colors hover:bg-surface-muted"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {String(lead.data?.name ?? lead.data?.full_name ?? 'Lead')}
                  {lead.data?.email ? (
                    <span className="ml-2 font-normal text-muted-foreground">
                      {String(lead.data.email)}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {lead.forms?.name ?? 'Form'} ·{' '}
                  {new Date(lead.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <LeadStatusBadge status={lead.status as LeadStatus} />
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / limit)}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(page - 1));
                  router.push(`/leads?${params.toString()}`, { scroll: false });
                }}
                className="rounded-md border border-border-strong bg-surface px-3 h-9 text-sm text-foreground hover:bg-surface-muted"
              >
                Previous
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(page + 1));
                  router.push(`/leads?${params.toString()}`, { scroll: false });
                }}
                className="rounded-md border border-border-strong bg-surface px-3 h-9 text-sm text-foreground hover:bg-surface-muted"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
