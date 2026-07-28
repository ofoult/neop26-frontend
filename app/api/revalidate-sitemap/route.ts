import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/site';

/**
 * On-demand trigger for the static sitemap/robots routes (see app/sitemap.ts,
 * app/robots.ts). Called by the backend's daily sync job (backend/src/sync/run.ts)
 * once new data has landed in Postgres, so the sitemap only regenerates when
 * there's actually something new — never on a runtime timer that could
 * coincide with the backend being asleep.
 *
 * `revalidateTag` only marks the cache stale; by itself, whoever makes the
 * *next* request (e.g. a crawler) would be the one to pay for regenerating
 * it. So after invalidating, this self-fetches robots.txt and every sitemap
 * chunk it lists, which forces Next to regenerate and re-cache them right
 * here, before anything else asks.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('sitemap');

  let warmed = 0;
  try {
    const robotsRes = await fetch(`${SITE_URL}/robots.txt`, { cache: 'no-store' });
    const robotsText = await robotsRes.text();
    const sitemapUrls = [...robotsText.matchAll(/^sitemap:\s*(\S+)$/gim)].map((m) => m[1]);
    await Promise.all(sitemapUrls.map((url) => fetch(url, { cache: 'no-store' })));
    warmed = sitemapUrls.length;
  } catch {
    // Best-effort: if warm-up fails, the tag is still invalidated, so the
    // routes just fall back to regenerating lazily on the next request.
  }

  return NextResponse.json({ revalidated: true, warmed, now: Date.now() });
}
