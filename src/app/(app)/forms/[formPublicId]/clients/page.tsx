import { redirect } from 'next/navigation';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { Card } from '@/components/ui';
import {
  ClientAccessPanel,
  type AccessRow,
  type PendingInvitation,
} from './client-access-panel';

export const metadata = { title: 'Client Access' };

export default async function FormClientsPage({
  params,
}: {
  params: Promise<{ formPublicId: string }>;
}) {
  const { supabase, workspace } = await requireWorkspace();
  const { formPublicId } = await params;

  const { data: form } = await supabase
    .from('forms')
    .select('id, name, public_id, workspace_id')
    .eq('public_id', formPublicId)
    .maybeSingle();

  if (!form || form.workspace_id !== workspace.id) {
    redirect('/forms');
  }

  const { data: invitationRows } = await supabase
    .from('invitations')
    .select('id, email, status, created_at, expires_at')
    .eq('form_id', form.id)
    .order('created_at', { ascending: false });

  const invitations: PendingInvitation[] = ((invitationRows ?? []) as Array<{
    id: string;
    email: string;
    status: string;
    created_at: string;
    expires_at: string;
  }>)
    .filter((row) => row.status === 'pending')
    .map((row) => ({
      id: row.id,
      email: row.email,
      created_at: row.created_at,
      expires_at: row.expires_at,
    }));

  // Preferred path (migration 018): returns client emails despite profiles RLS.
  let access: AccessRow[] = [];
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    'list_form_client_access',
    { p_form_id: form.id },
  );

  if (!rpcError && Array.isArray(rpcRows)) {
    access = (rpcRows as Array<{
      access_id: string;
      user_id: string;
      email: string | null;
      full_name: string | null;
      granted_at: string;
    }>).map((row) => ({
      id: row.access_id,
      email: row.email,
      full_name: row.full_name,
      granted_at: row.granted_at,
    }));
  } else {
    // Fallback before the migration is applied: rows are visible to the owner,
    // but profile emails are not (profiles RLS), so labels stay neutral.
    const { data: rows } = await supabase
      .from('client_form_access')
      .select('id, user_id, created_at')
      .eq('form_id', form.id)
      .order('created_at', { ascending: false });

    access = ((rows ?? []) as Array<{
      id: string;
      user_id: string;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      email: null,
      full_name: null,
      granted_at: row.created_at,
    }));
  }

  return (
    <>
      <PageHeader title="Client Access" />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Client access to {form.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invited clients get a read-only view of this form&apos;s submissions —
            nothing else in the workspace.
          </p>

          <div className="mt-6">
            <ClientAccessPanel
              formPublicId={form.public_id}
              formName={form.name}
              invitations={invitations}
              access={access}
            />
          </div>
        </Card>
      </div>
    </>
  );
}