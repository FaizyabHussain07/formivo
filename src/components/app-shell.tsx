'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { UserButton } from '@/components/user-button';

/**
 * Authenticated application navigation (PRD §8 Information Architecture).
 * Deliberately different from the marketing nav: this is the product shell.
 *
 * Desktop: fixed sidebar. Mobile: top bar with slide-down menu.
 */

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/forms', label: 'Forms' },
  { href: '/leads', label: 'Leads' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/clients', label: 'Clients' },
  { href: '/billing', label: 'Billing' },
  { href: '/settings', label: 'Settings' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

export function AppShell({
  user,
  workspaceName,
  children,
}: {
  user: { id: string; email: string };
  workspaceName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Application">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              active
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
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/dashboard" className="text-[15px] font-semibold tracking-tight">
            Formivo
          </Link>
        </div>
        <div className="border-b border-border px-4 py-3">
          <p className="truncate text-xs font-medium text-subtle-foreground">
            Workspace
          </p>
          <p className="truncate text-sm font-medium">
            {workspaceName ?? 'No workspace'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">{nav}</div>
        <div className="border-t border-border px-3 py-3">
          <UserButton user={user} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="text-[15px] font-semibold tracking-tight">
            Formivo
          </Link>
          <div className="flex items-center gap-2">
            <UserButton user={user} />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
              className="rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-surface-muted"
            >
              {mobileOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </header>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-b border-border bg-surface px-3 py-3 lg:hidden">
            {nav}
          </div>
        )}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
