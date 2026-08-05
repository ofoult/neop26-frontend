// The sitemap index: lists sitemap-static.xml plus every per-type/per-
// language/per-chunk sitemap file. Reached via middleware.ts's rewrite of
// the public /sitemap.xml URL — see lib/sitemap.ts for the filename scheme
// and app/api/sitemap/[type]/[lang]/[chunk]/route.ts for the files this
// indexes.

import { SITE_URL } from '@/lib/site';
import { allSitemapChunks, getSitemapCounts, sitemapFilename } from '@/lib/sitemap';
import { renderSitemapIndex, xmlResponse } from '@/lib/sitemapXml';

export async function GET() {
  const counts = await getSitemapCounts();
  const chunkUrls = allSitemapChunks(counts).map(
    (c) => `${SITE_URL}/${sitemapFilename(c.type, c.lang, c.chunkOneBased)}`,
  );
  const locs = [`${SITE_URL}/sitemap-static.xml`, ...chunkUrls];
  return xmlResponse(renderSitemapIndex(locs, new Date().toISOString()));
}
