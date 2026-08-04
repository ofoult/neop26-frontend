// Shared building blocks for the whole sitemap architecture: resource
// counts, chunk sizing, and the public filename scheme
// (sitemap-{type}-{lang}-{chunk}.xml). Used by app/api/sitemap/index/route.ts
// (lists every child file), app/api/sitemap/[type]/[lang]/[chunk]/route.ts
// (generates one), middleware.ts (parses an incoming request's filename back
// into type/lang/chunk to rewrite it to the right route), and
// app/api/revalidate-sitemap/route.ts (enumerates every file to warm after
// invalidation). Keeping it all in one module is what stops those pieces
// from independently recomputing the same thing and drifting apart.

import { API_BASE } from '@/lib/api';
import { routing } from '@/i18n/routing';

export const SITEMAP_TAG = 'sitemap';

export type SitemapResourceType = 'performer' | 'event' | 'venue';
export const SITEMAP_RESOURCE_TYPES: SitemapResourceType[] = ['performer', 'event', 'venue'];

export interface SitemapCounts {
  events: number;
  performers: number;
  venues: number;
}

/** Coerces a possibly-missing/non-numeric count (e.g. a field a not-yet-deployed
 * backend doesn't return yet) to a safe integer, so it can never poison the
 * chunk-count math downstream with NaN. */
export function safeCount(n: unknown): number {
  return Number.isFinite(n) ? (n as number) : 0;
}

export async function getSitemapCounts(): Promise<SitemapCounts> {
  try {
    const res = await fetch(`${API_BASE}/sitemap/counts`, { next: { revalidate: false, tags: [SITEMAP_TAG] } });
    if (!res.ok) return { events: 0, performers: 0, venues: 0 };
    const raw = (await res.json()) as Partial<SitemapCounts>;
    return { events: safeCount(raw.events), performers: safeCount(raw.performers), venues: safeCount(raw.venues) };
  } catch {
    // Backend unreachable (e.g. a sleeping free-tier instance during a
    // build) — degrade to an empty catalogue rather than failing the whole
    // build/request; every resource type still gets its one (empty) chunk
    // per language so the id space stays stable.
    return { events: 0, performers: 0, venues: 0 };
  }
}

export function countFor(counts: SitemapCounts, type: SitemapResourceType): number {
  if (type === 'performer') return counts.performers;
  if (type === 'venue') return counts.venues;
  return counts.events;
}

// Each <url> entry is now just a <loc> (+ <lastmod> for events) — hreflang
// alternates were dropped from the sitemap entirely (every page already sets
// its own hreflang tags independently in its own <head> via
// lib/hreflang.ts's hreflangAlternates, used from every locale page's
// generateMetadata — Google treats sitemap-hreflang and HTML-head-hreflang as
// equivalent, redundant signals, so nothing is lost). That makes entries tiny
// compared to the old alternates-laden design, so files can hold far more
// before hitting any size cap. 45,000 stays just under the sitemap
// protocol's own 50,000 URL/file limit (sitemaps.org) with margin, and even
// at a generous ~200 bytes/entry that's only ~9MB/file — nowhere near
// Vercel's 19.07MB prerendered-response cap.
export const CHUNK_SIZE = 45_000;

/** At least 1, so every (type, lang) pair always has a chunk 1 even when empty. */
export function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}

export interface SitemapChunkRef {
  type: SitemapResourceType;
  lang: string;
  chunkOneBased: number;
}

/** Every (type, lang, chunk) tuple that needs its own sitemap file, given resource counts. */
export function allSitemapChunks(counts: SitemapCounts): SitemapChunkRef[] {
  const out: SitemapChunkRef[] = [];
  for (const type of SITEMAP_RESOURCE_TYPES) {
    const chunks = chunkCount(countFor(counts, type));
    for (const lang of routing.locales) {
      for (let chunkOneBased = 1; chunkOneBased <= chunks; chunkOneBased++) {
        out.push({ type, lang, chunkOneBased });
      }
    }
  }
  return out;
}

export function sitemapFilename(type: SitemapResourceType, lang: string, chunkOneBased: number): string {
  return `sitemap-${type}-${lang}-${chunkOneBased}.xml`;
}

const FILENAME_RE = /^sitemap-(performer|event|venue)-([a-z]{2})-(\d+)\.xml$/;

/** Parses a request path (no leading slash) back into (type, lang, chunk), or null if it doesn't match. */
export function parseSitemapFilename(pathWithoutLeadingSlash: string): SitemapChunkRef | null {
  const match = pathWithoutLeadingSlash.match(FILENAME_RE);
  if (!match) return null;
  const [, type, lang, chunk] = match;
  if (!(routing.locales as readonly string[]).includes(lang)) return null;
  return { type: type as SitemapResourceType, lang, chunkOneBased: Number(chunk) };
}
