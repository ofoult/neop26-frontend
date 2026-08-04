import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { localePath } from '@/lib/hreflang';
import { SITE_URL } from '@/lib/site';

// Transactional, per-user flows — no SEO value, and the checkout step
// carries order details in the query string. Listed explicitly per locale
// since `localePrefix: 'as-needed'` means each non-default locale has its own
// prefixed path (e.g. /fr/checkout) that a bare "/checkout" rule wouldn't match.
const NON_DEFAULT_LOCALES = routing.locales.filter((l) => l !== routing.defaultLocale);
const DISALLOWED_PATHS = ['/checkout', '/confirmation'].flatMap((path) => [
  path,
  ...NON_DEFAULT_LOCALES.map((locale) => localePath(path, locale)),
]);

// The sitemap is now a real <sitemapindex> (see app/api/sitemap/index/route.ts,
// reached via middleware.ts's rewrite of /sitemap.xml) that itself lists
// every child sitemap file — robots.txt only needs to point at that one
// entry point instead of enumerating every chunk.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
