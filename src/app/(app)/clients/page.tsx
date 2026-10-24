import Link from 'next/link';
import { PageHeader, Card, Badge, Button } from '@/components/ui';
import { requireWorkspace } from '@/lib/session';

export const metadata = { title: 'Clients' };

export default async function ClientsPage() {
  const { supabase, workspace } = await requireWorkspace();

  const { data: access } = await supabase
    .from('client_form_access')
    .select('id, created_at, user_id, forms(name, public_id)')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  const rows = (access ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    forms: { name: string; public_id: string } | null;
  }>;

  return (
    <>
      <PageHeader
        title="Client Access"
        description="Invite a client to one form at a time. They get a read-only portal for that form alone."
      />
      <div className="px-5 py-6 lg:px-8 lg:py-8">
        <Card className="p-6">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">No clients yet</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Open a form and use its Client Access page to invite a client by
                email. They get a read-only dashboard for that form alone —
                without seeing your technical configuration.
              </p>
              <div className="mt-4">
                <Link href="/forms">
                  <Button>Choose a form to invite from</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-md border border-border p-4"
                >
                  <div>
                    <p className="font-medium">{row.forms?.name ?? 'Form'}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Assigned {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>Viewer</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
