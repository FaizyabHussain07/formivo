import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50 py-6 text-center text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 lg:flex-row lg:justify-between">
        <p>© {new Date().getFullYear()} Formivo. All rights reserved.</p>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
