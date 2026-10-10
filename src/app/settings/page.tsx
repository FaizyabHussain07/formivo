import { AppShell } from '@/components/app-shell';
import { requireWorkspace, PageHeader } from '@/lib/session';
import { Card, Badge } from '@/components/ui';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { supabase, user, workspace } = await requireWorkspace();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, created_at')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <AppShell user={user} workspaceName={workspace.name}>
      <PageHeader title="Settings" />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Workspace</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{workspace.name}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <dt className="text-muted-foreground">Role</dt>
                <dd>
                  <Badge>Owner</Badge>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-subtle-foreground">
              Workspace renaming arrives with the workspace settings phase.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">Account</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{profile?.full_name ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
