'use client';

import { useState, useTransition } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Input, Label, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { error } = await supabase.from('workspaces').insert({
        name: name.trim(),
        owner_id: user.id,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/dashboard?workspace=created');
      router.refresh();
    });
  };

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        Step 1 of 2
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        Create your workspace
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A workspace holds your forms, leads, and clients. You can rename it
        later in settings.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form className="mt-7 space-y-4" onSubmit={handleCreate}>
        <div className="space-y-1.5">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Agency"
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending || !name.trim()}>
          {pending ? 'Creating workspace...' : 'Create workspace'}
        </Button>
      </form>
    </div>
  );
}
