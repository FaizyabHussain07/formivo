import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { Card, Badge } from '@/components/ui';
import Link from 'next/link';

export const metadata = { title: 'Leads' };

export default async function ClientLeadsPage({
  params,
}: {
  params: Promise<{ formPublicId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  const { formPublicId } = await params;

  // Step 1: Find the form
  const formResult = await supabase
    .from('forms')
    .select('id, name')
    .eq('public_id', formPublicId)
    .single();

  const formRow = formResult.data as { id: string; name: string } | null;
  if (!formRow) redirect('/client');

  const formId = formRow.id;

  // Step 2: Check client_form_access
  const accessResult = await supabase
    .from('client_form_access')
    .select('id')
    .eq('user_id', user.id)
    .eq('form_id', formId)
    .single();

  const access = accessResult.data as { id: string } | null;
  if (!access) redirect('/client');

  const formName = formRow.name;

  const leadsResult = await supabase
    .from('leads')
    .select('id, data, status, created_at, metadata')
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .limit(50);

  const leadList = (leadsResult.data ?? []) as Array<{
    id: string;
    data: Record<string, unknown> | null;
    status: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }>;

  return (
    <>
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold">Leads</p>
          <Badge>{leadList.length} lead{leadList.length === 1 ? '' : 's'}</Badge>
        </div>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Card className="p-6">
          {leadList.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">No leads yet</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Once your form receives a submission, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leadList.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/client/forms/${formPublicId}/leads/${lead.id}`}
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
                        {new Date(lead.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge>{lead.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
