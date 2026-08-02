import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'he'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // The middleware still auto-detects locale from Accept-Language on each
  // request (localeDetection stays on), but without a cookie remembering
  // that choice: next-intl's middleware writes a `Set-Cookie: NEXT_LOCALE=…`
  // on every response by default, and any response carrying Set-Cookie is
  // treated as non-cacheable by Vercel's CDN — silently defeating every
  // page's `export const revalidate` (ISR never gets a cache HIT, so every
  // visit pays a full serverless render). Trade-off: a visitor who manually
  // switches language now gets re-detected from their browser's language on
  // their next fresh visit to an unprefixed URL, instead of it being
  // "sticky" via cookie — acceptable given the caching win, since navigation
  // within a chosen locale stays on that locale's prefixed URLs regardless.
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];
