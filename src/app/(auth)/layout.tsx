import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center justify-center border-b border-border">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M14 4h10c4.418 0 8 3.582 8 8v12c0 4.418-3.582 8-8 8h-2" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
            <path d="M14 24h22c3.314 0 6-2.686 6-6V18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
            <circle cx="14" cy="40" r="3" fill="currentColor" className="text-primary"/>
            <circle cx="34" cy="14" r="3" fill="currentColor" className="text-primary"/>
            <circle cx="24" cy="24" r="3" fill="currentColor" className="text-primary"/>
          </svg>
          Formivo
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="py-6 text-center text-sm text-subtle-foreground">
        <Link href="/privacy" className="hover:text-muted-foreground">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-muted-foreground">
          Terms
        </Link>
      </footer>
    </div>
  );
}
