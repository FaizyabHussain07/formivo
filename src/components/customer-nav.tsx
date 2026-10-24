'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';

interface CustomerNavProps {
  user: { id: string; email: string };
  workspaceName: string;
}

const APP_NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/forms', label: 'Forms' },
  { href: '/leads', label: 'Leads' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/clients', label: 'Clients' },
  { href: '/billing', label: 'Billing' },
  { href: '/settings', label: 'Settings' },
];

export function CustomerNav({ user, workspaceName }: CustomerNavProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/sign-in';
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-[15px] font-semibold tracking-tight">
            <Logo variant="wordmark" />
          </Link>
          <ul className="hidden items-center gap-1 text-sm lg:flex">
            {APP_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-haspopup="true"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
          >
            <span className="h-6 w-6 rounded-full bg-primary/10 text-xs font-medium text-primary flex items-center justify-center">
              {user.email.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[140px] truncate lg:inline-block">
              {workspaceName}
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-surface py-2 shadow-md">
                <div className="px-3 py-2">
                  <p className="font-medium text-sm">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {workspaceName}
                  </p>
                </div>
                <div className="my-1 border-t border-border" />
                <div className="space-y-1 px-3">
                  <Link
                    href="/settings"
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <Link
                    href="/billing"
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Billing
                  </Link>
                  <Link
                    href="/billing"
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Billing
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
