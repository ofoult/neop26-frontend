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
  // Event, venue and performer pages swap the category pills for a search field.
  const showSearch = (isEvent || pathname?.startsWith('/venue/') || pathname?.startsWith('/performer/')) ?? false;
  // The /map globe fills the viewport and captures scroll/drag: no footer below it.
  const isMap = pathname === '/map';
  const hideFooter = isPurchaseFlow || isMap;

  return (
    <>
      {!hideChrome && <Nav hideMarquee={hideMarquee} scrollAwayOnMobile={isEvent} showSearch={showSearch} />}
      <main style={{ minHeight: isMap ? undefined : '60vh' }}>{children}</main>
      {!hideChrome && !hideFooter ? <Footer /> : <div style={{ height: isEvent || isMap ? 0 : 80 }} />}
    </>
  );
}
