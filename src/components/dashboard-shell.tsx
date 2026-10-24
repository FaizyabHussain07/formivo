'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CustomerNav } from '@/components/customer-nav';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui';

interface DashboardShellProps {
  user: { id: string; email: string };
  workspaceName: string;
  children: React.ReactNode;
}

const SIDEBAR_NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/forms', label: 'Forms' },
  { href: '/leads', label: 'Leads' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/clients', label: 'Clients' },
  { href: '/billing', label: 'Billing' },
  { href: '/settings', label: 'Settings' },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(href + '/');
}

export function DashboardShell({ user, workspaceName, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = { push: (href: string) => window.location.href = href };

  const handleSignOut = async () => {
    const { createBrowserSupabaseClient } = await import('@/lib/supabase');
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/sign-in';
  };

  const sidebar = (
    <nav className="flex flex-col gap-1" aria-label="Application">
      {SIDEBAR_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${active
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <CustomerNav user={user} workspaceName={workspaceName} />

      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex-1 overflow-y-auto px-3 py-4">{sidebar}</div>
        <div className="flex flex-col gap-1 border-t border-border px-3 py-3">
          <Separator />
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-haspopup="true"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
          >
            <span className="h-7 w-7 rounded-full bg-primary/10 text-xs font-medium text-primary flex items-center justify-center">
              {user.email.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{workspaceName}</span>
          </button>

          {userMenuOpen && (
            <div className="mt-1 rounded-lg border border-border bg-surface p-2 shadow-md">
              <div className="px-3 py-2">
                <p className="font-medium text-sm">{user.email}</p>
                <p className="text-xs text-muted-foreground">Workspace Owner</p>
              </div>
              <div className="my-1 border-t border-border" />
              <div className="space-y-1 px-3">
                <Link
                  href="/settings"
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push('/settings');
                  }}
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
