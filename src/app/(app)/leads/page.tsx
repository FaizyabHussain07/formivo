import { Suspense } from 'react';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { LeadsClient } from './leads-client';

export const metadata = { title: 'Leads' };

function LeadsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-md border border-border bg-surface-muted p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-32 rounded bg-surface-muted" />
            <div className="h-5 w-16 rounded bg-surface-muted" />
          </div>
          <div className="mt-2 flex gap-4">
            <div className="h-3 w-24 rounded bg-surface-muted" />
            <div className="h-3 w-32 rounded bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; form?: string; page?: string }>;
}) {
  const { supabase, user, workspace } = await requireWorkspace();
  const params = await searchParams;

  const search = params.search ?? '';
  const statusFilter = params.status ?? '';
  const formFilter = params.form ?? '';
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const limit = 25;

  const rangeStart = (page - 1) * limit;
  const rangeEnd = page * limit - 1;

  let query = supabase
    .from('leads')
    .select('id, form_id, data, status, created_at, forms(name, public_id)', { count: 'exact' })
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  // Range is applied after filters
  const applyRange = (q: typeof query) => q.range(rangeStart, rangeEnd);

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  if (formFilter) {
    const { data: form } = await supabase
      .from('forms')
      .select('id')
      .eq('public_id', formFilter)
      .eq('workspace_id', workspace.id)
      .single();
    if (form) {
      query = query.eq('form_id', form.id);
    }
  }

  if (search) {
    query = query.or(`data->>'name' like ${{ like: '%' + search + '%' }}, data->>'email' like ${{ like: '%' + search + '%' }}, data->>'full_name' like ${{ like: '%' + search + '%' }}`);
  }

  const leadsQuery = applyRange(query);
  const [leadsResult, formsResult] = await Promise.all([
    leadsQuery,
    supabase.from('forms').select('id, public_id, name, status').eq('workspace_id', workspace.id).eq('status', 'active'),
  ]);

  const data = leadsResult.data;
  const count = leadsResult.count;

  const leads = (data ?? []) as unknown as Array<{
    id: string;
    data: Record<string, unknown> | null;
    status: string;
    created_at: string;
    forms: { name: string; public_id: string } | null;
  }>;

  const total = count ?? 0;
  const hasNext = page * limit < total;

  return (
    <>
      <PageHeader title="Leads" />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Suspense fallback={<LeadsSkeleton />}>
          <LeadsClient
            leads={leads}
            forms={(formsResult.data ?? []) as unknown as Array<{ id: string; public_id: string; name: string; status: string }>}
            search={search}
            statusFilter={statusFilter}
            formFilter={formFilter}
            page={page}
            total={total}
            limit={limit}
            hasNext={hasNext}
          />
        </Suspense>
      </div>
    </>
  );
}
