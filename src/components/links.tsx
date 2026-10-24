import Link from 'next/link';

const FORMIVO = 'https://formivo.faizyab.me';
const PRIMARY = '#00C2B0';

export function LinkCTA({
  href,
  label,
  accent = '#00C2B0',
}: {
  href: string;
  label: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        '--accent': accent,
        '--accent-foreground': '#0A0C10',
      } as React.CSSProperties}
    >
      {label}
    </Link>
  );
}

export function LinkCTAOutline({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-md border border-border bg-transparent px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted hover:border-muted-foreground/40"
    >
      {label}
    </Link>
  );
}

export function FormivoLink({
  href = FORMIVO,
  children,
  className = '',
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground ${className}`}
    >
      {children}
      <span className="text-[10px] uppercase tracking-wider">Formivo</span>
    </Link>
  );
}

export function FormivoCTALink({
  href = FORMIVO,
  label = 'Visit Formivo',
  className = '',
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${className}`}
    >
      {label}
    </Link>
  );
}

export function PricingLink({ href = '/pricing', children }: { href?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="text-link hover:underline">
      {children ?? 'View pricing'}
    </Link>
  );
}

export function DocsLink({ href = '/docs', children }: { href?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="text-link hover:underline">
      {children ?? 'Read the docs'}
    </Link>
  );
}

export function SignUpLink({ href = '/sign-up', children }: { href?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="text-link font-medium hover:underline">
      {children ?? 'Create your account'}
    </Link>
  );
}

export function SignInLink({ href = '/sign-in', children }: { href?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="text-link font-medium hover:underline">
      {children ?? 'Sign in'}
    </Link>
  );
}
