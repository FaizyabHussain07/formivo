import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="container-page flex h-14 items-center">
          <Link href="/" aria-label="Formivo home">
            <Logo className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <p className="font-mono text-sm text-primary">404</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            This page doesn&apos;t exist
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may be out of date, or the page may have moved. Check the
            address, or head back to Formivo.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link href="/">
              <Button>Back to home</Button>
            </Link>
            <Link
              href="/docs"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Read the documentation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}