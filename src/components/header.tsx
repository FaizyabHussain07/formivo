import Link from 'next/link';
import { Logo } from '@/components/logo';

interface HeaderProps {
  user?: { id: string; email: string; workspace?: { name: string } | null };
}

const PUBLIC_NAV = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

export function Header({ user }: HeaderProps) {
  return (      <header className="sticky top-0 z-40 border-b border-border bg-surface/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            <Logo variant="wordmark" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="hidden text-sm font-medium text-foreground lg:inline-block"
              >
                {user.workspace?.name ?? 'Workspace'}
              </Link>
              <AuthMenu user={user} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Start free
              </Link>
            </div>
          )}
          </div>
        </div>
      </header>
  );
}

function AuthMenu({ user }: { user: { id: string; email: string; workspace?: { name: string } | null } }) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="true"
        className="flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted"
      >
        <span className="h-6 w-6 rounded-full bg-primary/10 text-xs font-medium text-primary flex items-center justify-center">
          {user.email.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[140px] truncate lg:inline-block">
          {user.workspace?.name ?? 'Account'}
        </span>
      </button>
    </div>
  );
}
