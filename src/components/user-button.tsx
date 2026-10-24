'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, CreditCard, LogOut, Settings, UserRound } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface UserButtonProps {
  user: { id: string; email: string };
  /** Compact avatar-only rendering for the top bar. */
  compact?: boolean;
  /** Show the workspace label under the email. */
  contextLabel?: string;
  /**
   * Which experience this menu belongs to. The client variant deliberately
   * omits workspace administration, billing and developer navigation.
   */
  variant?: 'developer' | 'client';
}

/**
 * Account menu shared by the developer shell and the client portal.
 * Profile / Settings / Billing / Sign out — only actions that exist.
 */
export function UserButton({
  user,
  compact = false,
  contextLabel = 'Workspace owner',
  variant = 'developer',
}: UserButtonProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/sign-in';
    }
  };

  const initial = user.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={
          compact
            ? 'flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-1.5 text-muted-foreground transition-colors hover:bg-surface-muted'
            : 'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground'
        }
      >
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
          {initial}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-foreground">
              {user.email}
            </span>
            <span className="block truncate text-[11px] text-subtle-foreground">
              {contextLabel}
            </span>
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-lg border border-border bg-surface-elevated p-1.5 shadow-lg"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-[13px] font-medium text-foreground">{user.email}</p>
              <p className="truncate text-[11px] text-subtle-foreground">{contextLabel}</p>
            </div>
            <div className="my-1 h-px bg-border" />

            {variant === 'developer' ? (
              <>
                <MenuItem href="/settings" icon={Settings} onClick={() => setOpen(false)}>
                  Settings
                </MenuItem>
                <MenuItem href="/billing" icon={CreditCard} onClick={() => setOpen(false)}>
                  Billing
                </MenuItem>
                <MenuItem href="/client" icon={UserRound} onClick={() => setOpen(false)}>
                  Client portal
                </MenuItem>
                <div className="my-1 h-px bg-border" />
              </>
            ) : (
              <>
                <MenuItem href="/client" icon={UserRound} onClick={() => setOpen(false)}>
                  My shared forms
                </MenuItem>
                <div className="my-1 h-px bg-border" />
              </>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}