import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-light flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="text-foreground" aria-label="Formivo home">
            <Logo variant="wordmark" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 text-xs text-subtle-foreground">
          <p>© {new Date().getFullYear()} Formivo</p>
          <nav className="flex items-center gap-4" aria-label="Legal">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}