import { MarketingFooter, MarketingHeader } from '@/components/marketing';
import type { ReactNode } from 'react';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-light flex min-h-screen flex-col bg-background text-foreground">
      <MarketingHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <MarketingFooter />
    </div>
  );
}