import type { MetadataRoute } from 'next';
import { API_BASE } from '@/lib/api';
import { routing } from '@/i18n/routing';
import { localePath } from '@/lib/hreflang';
import { SITE_URL } from '@/lib/site';

// Prerendered at build time and only regenerated on-demand — see
// app/sitemap.ts for why (including why there's no `dynamic = 'force-static'`
// here) and app/api/revalidate-sitemap/route.ts for the trigger. Uses the
// same 'sitemap' cache tag so both regenerate together.
const SITEMAP_TAG = 'sitemap';

const CHUNK_SIZE = 45_000;

function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}

/** Coerces a possibly-missing/non-numeric count (e.g. a field a not-yet-deployed
 * backend doesn't return yet) to a safe integer, so it can never poison the
 * chunk-count math downstream with NaN. */
function safeCount(n: unknown): number {
  return Number.isFinite(n) ? (n as number) : 0;
}

// Every generated sitemap chunk (see app/sitemap.ts) needs to be listed
// explicitly — there's no single combined index route for a multi-file
// Next.js sitemap, so this recomputes the same chunk count from the same
// counts endpoint to stay in sync automatically as the catalogue grows.
async function sitemapUrls(): Promise<string[]> {
  let counts = { events: 0, performers: 0, venues: 0 };
  try {
    const res = await fetch(`${API_BASE}/sitemap/counts`, { next: { revalidate: false, tags: [SITEMAP_TAG] } });
    if (res.ok) {
      const raw = (await res.json()) as Partial<typeof counts>;
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

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: DISALLOWED_PATHS,
    },
    sitemap: await sitemapUrls(),
    host: SITE_URL,
  };
}
