'use client';

import { usePathname } from '@/i18n/navigation';
import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Nav } from './Nav';

// Nav + Footer are hidden on the confirmation screen so it reads as a focused,
// standalone moment (per the design spec). A spacer preserves bottom breathing
// room where the footer would otherwise sit.
export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith('/confirmation') ?? false;

  // Checkout and event pages are focused purchase screens: no marquee, no footer.
  const isPurchaseFlow = (pathname?.startsWith('/checkout') || pathname?.startsWith('/event/')) ?? false;
  // No bottom spacer on event pages: the sticky seating plan needs the page to
  // end flush with the ticket list, or it gets pushed up at the end of the scroll.
  const isEvent = pathname?.startsWith('/event/') ?? false;
  const hideMarquee = isPurchaseFlow;
  const hideFooter = isPurchaseFlow;

  return (
    <>
      {!hideChrome && <Nav hideMarquee={hideMarquee} />}
      <main style={{ minHeight: '60vh' }}>{children}</main>
      {!hideChrome && !hideFooter ? <Footer /> : <div style={{ height: isEvent ? 0 : 80 }} />}
    </>
  );
}
