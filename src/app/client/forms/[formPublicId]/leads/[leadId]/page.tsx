import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { AppShell } from '@/components/app-shell';
import { Card, Badge, Link } from '@/components/ui';

export const metadata = { title: 'Lead' };

export default async function ClientLeadDetailPage({
  params,
}: {
  params: Promise<{ formPublicId: string; leadId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  const { formPublicId, leadId } = await params;

  // Verify form access
  const { data: access } = await supabase
    .from('client_form_access')
    .select('id, forms(id)')
    .eq('user_id', user.id)
    .eq('forms.public_id', formPublicId)
    .single();

  if (!access) redirect('/client');

  // Get lead
  const { data: leadData } = await supabase
    .from('leads')
    .select('id, data, metadata, status, created_at, updated_at')
    .eq('id', leadId)
    .eq('form_id', access.forms.id)
    .single();

  if (!leadData) redirect(`/client/forms/${formPublicId}/leads`);

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

  const primaryFields = ['name', 'full_name', 'email', 'phone', 'company', 'message', 'subject'] as const;
  const primaryData = Object.fromEntries(
    Object.entries(leadData.data).filter(([key]) => primaryFields.includes(key as typeof primaryFields[number])),
  );

  return (
    <AppShell
      user={{ id: user.id, email: user.email }}
      workspaceName=""
    >
      <div className="border-b border-border bg-surface-muted/50 px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/client/forms/${formPublicId}/leads`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Leads
          </Link>
        </div>
      </div>

      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Lead Details</h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge>{leadData.status}</Badge>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Submitted</span>
            <span className="text-sm font-medium">
              {new Date(leadData.created_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {primaryData && Object.keys(primaryData).length > 0 && (
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
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

          {Object.keys(leadData.data).length > primaryFields.length && (
            <dl className="mt-6 space-y-3 text-sm">
              <h3 className="text-sm font-semibold">All Fields</h3>
              {Object.entries(leadData.data)
                .filter(([key]) => !primaryFields.includes(key as typeof primaryFields[number]))
                .map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between border-b border-border pb-3">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-shrink-0 max-w-[120px]">
                      {key}
                    </dt>
                    <dd className="mt-0.5 text-foreground">{renderValue(value)}</dd>
                  </div>
                ))}
            </dl>
          )}

          {leadData.metadata && Object.keys(leadData.metadata).length > 0 && (
            <dl className="mt-6 space-y-3 text-sm">
              <h3 className="text-sm font-semibold">Metadata</h3>
              {Object.entries(leadData.metadata).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between border-b border-border pb-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</dt>
                  <dd className="mt-0.5 text-foreground">{renderValue(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
