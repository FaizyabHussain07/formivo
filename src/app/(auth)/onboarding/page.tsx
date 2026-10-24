'use client';

import { useState, useTransition } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Button, Card, Input, Label } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  return (
    <div className="flex flex-col">
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-5 py-12 lg:px-8">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              One workspace per account. You can rename it later in settings.
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:max-w-2xl">
            <Card className="flex flex-1 flex-col gap-6 p-6">
              <WorkspaceForm />
            </Card>

            <div className="flex flex-1 flex-col gap-6">
              <Card className="p-6">
                <h3 className="text-sm font-semibold">What is a workspace?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A workspace holds everything for one team: your forms, the leads they
                  capture, and the clients you invite to view read-only dashboards.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-semibold">After this step</h3>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-primary shrink-0">→</span>
                    You&apos;ll land on your workspace dashboard.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-primary shrink-0">→</span>
                    You can create your first form and connect it to your website.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-primary shrink-0">→</span>
                    You can invite clients to see their own read-only view.
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function WorkspaceForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }
    setError(null);

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Your session expired. Please sign in again.');
        return;
      }

      // One workspace per account: if one already exists, go straight to it.
      const { data: existing } = await supabase
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      // owner_id must be set explicitly — the insert policy checks
      // auth.uid() = owner_id, and a trigger creates the owner membership.
      const { error } = await supabase
        .from('workspaces')
        .insert({ name: name.trim(), owner_id: user.id });

      if (error) {
        // Never surface raw database errors.
        setError(
          error.code === '42501'
            ? 'You already have a workspace. Refresh the page to continue.'
            : 'Could not create the workspace. Please try again.',
        );
        return;
      }

      router.push('/dashboard?workspace=created');
      router.refresh();
    });
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreate() }}>
      {error && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Company"
          autoFocus
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? 'Creating...'
          : `Create workspace for ${name || 'your account'}`}
      </Button>

      <p className="text-xs text-muted-foreground">
        No credit card required. You can change everything later.
      </p>
    </form>
  );
}
