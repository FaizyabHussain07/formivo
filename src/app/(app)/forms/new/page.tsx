import { requireWorkspace, PageHeader } from '@/lib/session';
import { NewFormFlow } from './new-form-flow';

export const metadata = { title: 'Create Form' };

export default async function NewFormPage() {
  const { user, workspace } = await requireWorkspace();

  return (
    <>
      <PageHeader title="Create Form" />
      <div className="py-6 lg:py-8">
        <NewFormFlow />
      </div>
    </>
  );
}
