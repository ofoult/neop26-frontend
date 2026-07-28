// Shared by app/sitemap.ts and app/robots.ts, which both need to compute the
// exact same chunk boundaries independently (there's no single combined index
// route for a multi-file Next.js sitemap) — duplicating this logic risked the
// two files drifting to different CHUNK_SIZE values and desyncing.

export interface SitemapCounts {
  events: number;
  performers: number;
  venues: number;
}

// Each URL entry carries 5 hreflang alternates (see lib/hreflang.ts), so a
// file's byte size is much higher per-URL than Google's 50,000 URL/file cap
// alone would suggest. At 45,000 URLs/file, the events chunk measured ~26.4MB,
// over Vercel's 19.07MB prerendered-response cap (FALLBACK_BODY_TOO_LARGE).
// 12,000 keeps every chunk comfortably under that even for the densest data.
export const CHUNK_SIZE = 12_000;

/** Coerces a possibly-missing/non-numeric count (e.g. a field a not-yet-deployed
 * backend doesn't return yet) to a safe integer, so it can never poison the
 * chunk-count math downstream with NaN. */
export function safeCount(n: unknown): number {
  return Number.isFinite(n) ? (n as number) : 0;
}

/** At least 1, so the id space stays stable even when a resource is empty. */
export function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}
