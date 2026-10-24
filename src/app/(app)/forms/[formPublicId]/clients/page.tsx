import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db/server';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { Card, Badge, Button, Input, Label } from '@/components/ui';

export const metadata = { title: 'Clients' };

export default async function FormClientsPage({
  params,
}: {
  params: Promise<{ formPublicId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/sign-in');

  const { workspace } = await requireWorkspace();
  const { formPublicId } = await params;

  const { data: form } = await supabase
    .from('forms')
    .select('id, name, public_id, workspace_id')
    .eq('public_id', formPublicId)
    .maybeSingle();

  if (!form || form.workspace_id !== workspace.id) {
    redirect('/forms');
  }

  const { data: access } = await supabase
    .from('client_form_access')
    .select('id, created_at, user_id')
    .eq('workspace_id', workspace.id)
    .eq('form_id', form.id)
    .order('created_at', { ascending: false });

  const clientRows = (access ?? []) as Array<{
    id: string;
    created_at: string;
    user_id: string;
  }>;

  // Get profile info for each client
  const clientIds = clientRows.map((c) => c.user_id);
  let profiles: Array<{ id: string; email: string; full_name: string | null }> = [];

  if (clientIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', clientIds);
    profiles = profileData ?? [];
  }

  return (
    <>
      <PageHeader title="Client Access" />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Client Access for {form.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite clients to view leads from this form. They get a read-only dashboard.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const email = formData.get('email') as string;

              const res = await fetch('/api/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formPublicId, email }),
              });

              const data = await res.json();
              if (!res.ok) {
                alert(data.error?.message || 'Failed to send invitation');
                return;
              }

              window.location.reload();
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="client-email">Client email</Label>
                <Input
                  id="client-email"
                  name="email"
                  type="email"
                  placeholder="client@example.com"
                  required
                />
              </div>
              <Button type="submit">Invite Client</Button>
            </div>
          </form>

          {clientRows.length === 0 ? (
            <div className="mt-8 rounded-md border border-border bg-surface-muted/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No clients have been invited to this form yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              {clientRows.map((client) => {
                const profile = profiles.find((p) => p.id === client.user_id);
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{profile?.email ?? client.user_id}</p>
                      {profile?.full_name && (
                        <p className="text-xs text-muted-foreground">{profile.full_name}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Invited {new Date(client.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>Viewer</Badge>
                      <Button variant="ghost" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
