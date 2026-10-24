'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { LinkButton } from '@/components/ui';
import { APP_URL } from '@/lib/app-config';

/**
 * Public site navigation and footer (marketing experience only).
 * Auth screens use a slimmer variant so the sign-in flow stays focused.
 */

const NAV = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

const FOOTER_PRODUCT = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Documentation' },
];

const FOOTER_LEGAL = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
];

export function MarketingHeader({ user }: { user?: { email: string } | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center text-foreground"
            aria-label="Formivo home"
          >
            <Logo variant="wordmark" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <LinkButton href="/dashboard" size="sm">
              Open dashboard
            </LinkButton>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Log in
              </Link>
              <LinkButton href="/sign-up" size="sm">
                Get started
              </LinkButton>
            </>
          )}
        </div>

        <MobileMenu user={user} />
      </div>
    </header>
  );
}

/* Mobile navigation — disclosure pattern, keyboard and screen-reader usable. */
function MobileMenu({ user }: { user?: { email: string } | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-14 border-b border-border bg-background shadow-md">
          <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
              {user ? (
                <LinkButton href="/dashboard" onClick={() => setOpen(false)}>
                  Open dashboard
                </LinkButton>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                  >
                    Log in
                  </Link>
                  <LinkButton href="/sign-up" onClick={() => setOpen(false)}>
                    Get started
                  </LinkButton>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex text-foreground" aria-label="Formivo home">
              <Logo variant="wordmark" />
            </Link>
            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              Formivo is a developer-first form backend: connect the website forms you
              already have, collect every submission as a lead, and share a read-only
              dashboard with your clients.
            </p>
            <p className="mt-4 text-[13px] text-subtle-foreground">
              Forms to leads. Leads to clients.
            </p>
          </div>

          <nav aria-label="Product">
            <p className="text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {FOOTER_PRODUCT.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p className="text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">
              Legal
            </p>
            <ul className="mt-3 space-y-2">
              {FOOTER_LEGAL.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={APP_URL}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  formivo.faizyab.me
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-subtle-foreground">
            © {new Date().getFullYear()} Formivo. All rights reserved.
          </p>
          <p className="text-xs text-subtle-foreground">
            {APP_URL.replace(/^https?:\/\//, '')}
          </p>
        </div>
      </div>
    </footer>
  );
}