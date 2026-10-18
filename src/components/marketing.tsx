import Link from "next/link";
import { APP_URL } from "@/lib/app-config";
import { LinkButton } from "@/components/ui";

const nav = [
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M14 4h10c4.418 0 8 3.582 8 8v12c0 4.418-3.582 8-8 8h-2" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
              <path d="M14 24h22c3.314 0 6-2.686 6-6V18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
              <circle cx="14" cy="40" r="3" fill="currentColor" className="text-primary"/>
              <circle cx="34" cy="14" r="3" fill="currentColor" className="text-primary"/>
              <circle cx="24" cy="24" r="3" fill="currentColor" className="text-primary"/>
            </svg>
            Formivo
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <LinkButton href="/sign-up" size="sm">
            Start Free
          </LinkButton>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="container-page flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
        <p>
          © {new Date().getFullYear()} Formivo —{" "}
          <span className="text-subtle-foreground">form-to-lead infrastructure</span>
        </p>
        <nav className="flex items-center gap-6">
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs" className="transition-colors hover:text-foreground">
            Documentation
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
      <p className="sr-only">{APP_URL}</p>
    </footer>
  );
}
