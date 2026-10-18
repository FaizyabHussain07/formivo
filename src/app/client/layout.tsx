import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';

const NAV_ITEMS = [
  { href: '/client', label: 'Overview' },
  { href: '/client/leads', label: 'Leads' },
  { href: '/client/analytics', label: 'Analytics' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
