'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Share2,
  X,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { UserButton } from '@/components/user-button';

/**
 * Developer application shell — desktop sidebar + compact top bar,
 * with an off-canvas drawer on mobile (PRD §8).
 *
 * Navigation is deliberately denser and quieter than the marketing site:
 * this is the product, not the pitch.
 */

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/forms', label: 'Forms', icon: FileText },
      { href: '/leads', label: 'Leads', icon: Inbox },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Sharing',
    items: [{ href: '/clients', label: 'Client Access', icon: Share2 }],
  },
  {
    label: 'Account',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    label: 'Resources',
    items: [{ href: '/docs', label: 'Documentation', icon: BookOpen }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
  collapsed = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Application">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                      active
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-none" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  user,
  workspaceName,
  children,
}: {
  user: { id: string; email: string };
  workspaceName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/dashboard" className="text-foreground" aria-label="Formivo home">
            <Logo variant="wordmark" />
          </Link>
        </div>

        {/* Workspace context (one workspace per account — not a fake switcher) */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
            {workspaceName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">
              {workspaceName}
            </p>
            <p className="truncate text-[11px] text-subtle-foreground">Workspace</p>
          </div>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-2.5 py-4">
          <NavLinks pathname={pathname} />
        </div>            <div className="border-t border-border p-2.5">
              <UserButton user={user} />
            </div>
          </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: workspace/account context + primary menu trigger */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link href="/dashboard" className="lg:hidden" aria-label="Formivo home">
              <Logo variant="wordmark" />
            </Link>
            <p className="hidden min-w-0 truncate text-sm text-muted-foreground lg:block">
              <span className="text-foreground">{workspaceName}</span>
              <span className="mx-2 text-subtle-foreground">/</span>
              <span className="text-subtle-foreground">Developer workspace</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/docs"
              className="hidden rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground sm:inline-flex"
            >
              Docs
            </Link>
            <UserButton user={user} compact />
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[268px] max-w-[85vw] flex-col border-r border-border bg-surface shadow-lg">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Link
                href="/dashboard"
                onClick={() => setDrawerOpen(false)}
                aria-label="Formivo home"
              >
                <Logo variant="wordmark" />
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-[13px] font-medium text-foreground">
                {workspaceName}
              </p>
              <p className="truncate text-[11px] text-subtle-foreground">Workspace</p>
            </div>

            <div className="scroll-thin flex-1 overflow-y-auto px-2.5 py-4">
              <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>

            <div className="border-t border-border p-2.5">
              <UserButton user={user} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}