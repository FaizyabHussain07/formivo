import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * Canonical Formivo logo.
 * Single source of truth for the brand mark across marketing, auth, dashboard,
 * and client shells. Uses the exact public/logo.png asset.
 *
 * Variants:
 *  - wordmark: icon + "Formivo" text (navbar, auth header, sidebar logo)
 *  - icon: symbol only (small UI spaces, favicon-style usage)
 *
 * Light vs dark is handled by the shell's theme class; the image itself is
 * the dark-on-transparent mark from public/logo.png.
 */
export function Logo({ variant = 'wordmark', className = '' }: {
  variant?: 'wordmark' | 'icon';
  className?: string;
}) {
  if (variant === 'icon') {
    return (
      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={24}
        height={24}
        className={`${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={22}
        height={22}
        className=""
      />
      <span className="text-[15px] font-semibold tracking-tight">Formivo</span>
    </span>
  );
}

/** Convenience wrapper for a logo with a visible label (for layouts that need
 * an accessible name on the link itself). */
export function LogoLink({
  href = '/',
  children,
  className = '',
}: {
  href?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight ${className}`}
    >
      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={22}
        height={22}
        className=""
      />
      <span>Formivo</span>
      {children}
    </a>
  );
}
