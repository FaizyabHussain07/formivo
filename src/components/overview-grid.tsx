import { Card } from '@/components/ui';

export function OverviewGrid({
  totalLeads,
  newLeads,
  formsCount,
}: {
  totalLeads: number;
  newLeads: number;
  formsCount: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Total Leads</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{totalLeads}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">New Leads</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">{newLeads}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Forms</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{formsCount}</p>
      </Card>
    </div>
  );
}
