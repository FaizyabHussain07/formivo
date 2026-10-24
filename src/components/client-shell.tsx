'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { BarChart3, FileText, LayoutDashboard, Menu, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { UserButton } from '@/components/user-button';

/**
 * Client portal shell — the same brand, a deliberately smaller surface.
 *
 * Clients are read-only viewers of the forms shared with them. There is no
 * workspace administration, no billing, no API configuration and no access to
 * unrelated forms here; those routes are separately server-protected.
 */

const CLIENT_NAV: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: '/client', label: 'Overview', icon: LayoutDashboard },
  { href: '/client/forms', label: 'Shared Forms', icon: FileText },
  { href: '/client/analytics', label: 'Analytics', icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === '/client') return pathname === '/client';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ClientNavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Client portal">
      {CLIENT_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
              active
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 flex-none" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ClientShell({
  user,
  workspaceName = 'Client Portal',
  children,
}: {
  user: { id: string; email: string };
  workspaceName?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/client" className="text-foreground" aria-label="Formivo client portal">
            <Logo variant="wordmark" />
          </Link>
        </div>

        <div className="border-b border-border px-4 py-3">
          <span className="badge border-primary/25 bg-primary/10 text-primary">
            Client Portal
          </span>
          <p className="mt-2 truncate text-[13px] font-medium text-foreground">
            {workspaceName}
          </p>
          <p className="truncate text-[11px] text-subtle-foreground">Read-only access</p>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-2.5 py-4">
          <ClientNavLinks pathname={pathname} />
        </div>

        <div className="border-t border-border p-2.5">
          <UserButton user={user} variant="client" contextLabel="Client viewer" />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link href="/client" className="lg:hidden" aria-label="Formivo client portal">
              <Logo variant="wordmark" />
            </Link>
            <span className="hidden text-sm text-muted-foreground lg:inline">
              <span className="text-foreground">Client Portal</span>
              <span className="mx-2 text-subtle-foreground">/</span>
              <span className="text-subtle-foreground">Read-only</span>
            </span>
          </div>

          <UserButton user={user} variant="client" compact contextLabel="Client viewer" />
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
              <Link href="/client" onClick={() => setDrawerOpen(false)} aria-label="Formivo client portal">
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
              <span className="badge border-primary/25 bg-primary/10 text-primary">
                Client Portal
              </span>
              <p className="mt-2 truncate text-[13px] font-medium text-foreground">
                {workspaceName}
              </p>
            </div>

            <div className="scroll-thin flex-1 overflow-y-auto px-2.5 py-4">
              <ClientNavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>

            <div className="border-t border-border p-2.5">
              <UserButton user={user} variant="client" contextLabel="Client viewer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}