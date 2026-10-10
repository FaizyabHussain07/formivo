'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useState } from 'react';

interface UserButtonProps {
  user: {
    id: string;
    email: string;
    metadata?: Record<string, unknown>;
  };
}

export function UserButton({ user }: UserButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/sign-in';
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
      >
        <span className="h-7 w-7 rounded-md bg-muted text-xs font-medium text-muted-foreground flex items-center justify-center">
          {user.email?.charAt(0).toUpperCase() ?? '?'}
        </span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-md">
            <div className="px-3 py-2">
              <p className="font-medium text-sm">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                Workspace Owner
              </p>
            </div>
            <div className="border-t border-border my-1 pt-1">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
