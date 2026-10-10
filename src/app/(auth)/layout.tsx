import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center justify-center border-b border-border">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
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
