import type { MetadataRoute } from 'next';
import { API_BASE } from '@/lib/api';
import { routing } from '@/i18n/routing';
import { localePath } from '@/lib/hreflang';
import { SITE_URL } from '@/lib/site';
import { chunkCount, safeCount, type SitemapCounts } from '@/lib/sitemap';

// Prerendered at build time and only regenerated on-demand — see
// app/sitemap.ts for why (including why there's no `dynamic = 'force-static'`
// here) and app/api/revalidate-sitemap/route.ts for the trigger. Uses the
// same 'sitemap' cache tag so both regenerate together.
const SITEMAP_TAG = 'sitemap';

// Every generated sitemap chunk (see app/sitemap.ts) needs to be listed
// explicitly — there's no single combined index route for a multi-file
// Next.js sitemap, so this recomputes the same chunk count from the same
// counts endpoint to stay in sync automatically as the catalogue grows.
async function sitemapUrls(): Promise<string[]> {
  let counts: SitemapCounts = { events: 0, performers: 0, venues: 0 };
  try {
    const res = await fetch(`${API_BASE}/sitemap/counts`, { next: { revalidate: false, tags: [SITEMAP_TAG] } });
    if (res.ok) {
      const raw = (await res.json()) as Partial<SitemapCounts>;
      counts = { events: safeCount(raw.events), performers: safeCount(raw.performers), venues: safeCount(raw.venues) };
    }
  } catch {
    // Backend unreachable — fall back to just the static-page sitemap chunk.
  }
  const total = 1 + chunkCount(counts.performers) + chunkCount(counts.venues) + chunkCount(counts.events);
  return Array.from({ length: total }, (_, id) => `${SITE_URL}/sitemap/${id}.xml`);
}

// Transactional, per-user flows — no SEO value, and the checkout step
// carries order details in the query string. Listed explicitly per locale
// since `localePrefix: 'as-needed'` means each non-default locale has its own
// prefixed path (e.g. /fr/checkout) that a bare "/checkout" rule wouldn't match.
const NON_DEFAULT_LOCALES = routing.locales.filter((l) => l !== routing.defaultLocale);
const DISALLOWED_PATHS = ['/checkout', '/confirmation'].flatMap((path) => [
  path,
  ...NON_DEFAULT_LOCALES.map((locale) => localePath(path, locale)),
]);

// /browse's free-text (q), location (where), and date-range (from/to) filters
// produce effectively unbounded, low-value URL combinations with no lasting
// canonical value — crawling them wastes crawl budget/bandwidth for no SEO
// gain. `cat` (listed in the sitemap) and `page` (real paginated content,
// see browse/page.tsx) stay crawlable. `*` is a wildcard extension search
// engines widely support, matching regardless of param order/position.
const BROWSE_FILTER_DISALLOW = routing.locales.flatMap((locale) => {
  const browsePath = localePath('/browse', locale);
  return ['q', 'where', 'from', 'to'].map((param) => `${browsePath}?*${param}=`);
});

// Only search engines get crawl access — everything else (AI crawlers, social
// preview bots, generic scrapers) is disallowed here for well-behaved bots,
// and actively blocked at the edge in middleware.ts for bots that don't
// bother reading robots.txt.
const SEARCH_ENGINE_BOTS = ['Googlebot', 'Google-InspectionTool', 'Bingbot', 'DuckDuckBot', 'Applebot', 'Yandex'];

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: [
      ...SEARCH_ENGINE_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: [...DISALLOWED_PATHS, ...BROWSE_FILTER_DISALLOW],
      })),
      { userAgent: '*', disallow: '/' },
    ],
    sitemap: await sitemapUrls(),
    host: SITE_URL,
  };
}
