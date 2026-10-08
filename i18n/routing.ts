import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'he', 'it', 'nl', 'sv', 'ru', 'ar', 'hu', 'pl', 'hr', 'pt'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // A NEXT_LOCALE cookie remembers the visitor's language. Without it, picking
  // English (the unprefixed default) just requests `/`, which the middleware
  // re-detects from Accept-Language and redirects straight back to e.g. `/fr`.
  // next-intl only sets the cookie when its value changes (and the language
  // switcher writes it client-side), so it isn't re-sent on every response.
  // (It used to be disabled because Vercel's CDN won't cache responses with
  // Set-Cookie; the site has since moved to Coolify.)
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];
