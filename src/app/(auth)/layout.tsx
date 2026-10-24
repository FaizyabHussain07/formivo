import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-light flex min-h-screen flex-col">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-5 px-5">
          <Link href="/" className="text-foreground" aria-label="Formivo home">
            <Logo variant="wordmark" />
          </Link>
          <Link
            href="/"
            className="flex-1 text-right"
          >
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to site
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="border-t border-border bg-surface/50">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-5 text-xs text-subtle-foreground">
          <p>© {new Date().getFullYear()} Formivo</p>
          <nav className="flex items-center gap-4" aria-label="Legal">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}