import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/site';
import { allSitemapChunks, getSitemapCounts, sitemapFilename, SITEMAP_TAG } from '@/lib/sitemap';

/**
 * On-demand trigger for the static sitemap/robots routes (see
 * app/api/sitemap/, app/robots.ts). Called by the backend's daily sync job
 * (backend/src/sync/run.ts) once new data has landed in Postgres, so the
 * sitemap only regenerates when there's actually something new — never on a
 * runtime timer that could coincide with the backend being asleep.
 *
 * `revalidateTag` only marks the cache stale; by itself, whoever makes the
 * *next* request (e.g. a crawler) would be the one to pay for regenerating
 * it. So after invalidating, this self-fetches robots.txt, the sitemap
 * index, the static-pages sitemap, and every per-type/language/chunk sitemap
 * file, which forces Next to regenerate and re-cache all of them right here,
 * before anything else asks. (robots.txt itself only ever points at the one
 * index URL now, so — unlike before — the child sitemap URLs have to be
 * enumerated directly via lib/sitemap.ts rather than scraped out of it.)
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag(SITEMAP_TAG);

  let warmed = 0;
  try {
    const counts = await getSitemapCounts();
    const chunkUrls = allSitemapChunks(counts).map(
      (c) => `${SITE_URL}/${sitemapFilename(c.type, c.lang, c.chunkOneBased)}`,
    );
    const urls = [`${SITE_URL}/robots.txt`, `${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-static.xml`, ...chunkUrls];
    await Promise.all(urls.map((url) => fetch(url, { cache: 'no-store' })));
    warmed = urls.length;
  } catch {
    // Best-effort: if warm-up fails, the tag is still invalidated, so the
    // routes just fall back to regenerating lazily on the next request.
  }

  return NextResponse.json({ revalidated: true, warmed, now: Date.now() });
}
