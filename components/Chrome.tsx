'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Nav } from './Nav';

// Nav + Footer are hidden on the confirmation screen so it reads as a focused,
// standalone moment (per the design spec). A spacer preserves bottom breathing
// room where the footer would otherwise sit.
export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith('/confirmation') ?? false;

  return (
    <>
      {!hideChrome && <Nav />}
      <main style={{ minHeight: '60vh' }}>{children}</main>
      {!hideChrome ? <Footer /> : <div style={{ height: 80 }} />}
    </>
  );
}
