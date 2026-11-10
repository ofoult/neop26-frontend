'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';
import { enterPage, pageTypeOf, scrollPct, setUserProperties, stripLocale, track } from '@/lib/analytics';
import { useCurrency } from '@/lib/currency';

const SCROLL_MILESTONES = [25, 50, 75];

/** Where on the page a click happened: the nearest `data-track-section`, else the page chrome it sits in. */
function sectionOf(el: Element): string {
  const tagged = el.closest('[data-track-section]');
  if (tagged) return tagged.getAttribute('data-track-section') as string;
  if (el.closest('header, nav')) return 'nav';
  if (el.closest('footer')) return 'footer';
  if (el.closest('[role="dialog"]')) return 'dialog';
  return 'content';
}

function labelOf(el: Element): string {
  const text = el.getAttribute('aria-label') || el.textContent || '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Site-wide journey tracking, mounted once in <Chrome>: counts pages in the
 * session, reports every link/button click (`ui_click`) with where it was and
 * where it leads, and scroll depth at 25/50/75 % (GA's own `scroll` covers 90 %).
 * Rendered *before* the page content so its page-change effect runs ahead of
 * the page's own tracking effects.
 */
export function JourneyTracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const { currency } = useCurrency();

  useEffect(() => {
    enterPage(pathname ?? window.location.pathname);

    const reached = new Set<number>();
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        // Nothing to report on pages that fit the viewport without scrolling.
        if (window.scrollY === 0) return;
        const pct = scrollPct();
        for (const m of SCROLL_MILESTONES) {
          if (pct >= m && !reached.has(m)) {
            reached.add(m);
            track('scroll_depth', { percent_scrolled: m });
          }
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    setUserProperties({ site_locale: locale, display_currency: currency ?? 'event_default' });
  }, [locale, currency]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const el = target?.closest?.('a, button, [role="button"], [role="tab"]');
      if (!el) return;
      const href = el instanceof HTMLAnchorElement ? el.href : '';
      let linkType = 'button';
      let linkUrl: string | undefined;
      let targetPageType: string | undefined;
      if (href) {
        try {
          const u = new URL(href);
          if (u.origin === window.location.origin) {
            linkType = 'internal';
            linkUrl = stripLocale(u.pathname);
            targetPageType = pageTypeOf(u.pathname);
          } else {
            linkType = 'outbound';
            // Host + path only: outbound query strings carry affiliate/tracking params.
            linkUrl = u.host + u.pathname;
          }
        } catch {
          // Not a navigable URL (mailto:, tel:, …).
          linkType = 'other';
        }
      }
      track('ui_click', {
        click_section: sectionOf(el),
        link_text: labelOf(el),
        link_type: linkType,
        link_url: linkUrl,
        target_page_type: targetPageType,
      });
    }
    // Capture phase: still sees clicks whose handlers stop propagation.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
