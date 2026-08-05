// Hand-rolled sitemap XML. Next.js's built-in `MetadataRoute.Sitemap`
// convention (used here previously) only emits a flat <urlset> at a fixed
// `/sitemap/[id].xml` path — it can't produce a real <sitemapindex> pointing
// at other sitemap files, and it can't produce a custom filename either,
// both of which this project's multi-file-per-language scheme needs. See
// lib/sitemap.ts for the filename/chunking scheme these are rendered from.

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderUrlset(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map((e) => {
      const parts = [`<loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`<lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
      return `<url>${parts.join('')}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

/** `lastmod` is a single build-time timestamp shared by every listed child file — they're all
 * (re)generated together in the same revalidation cycle, so there's no more precise per-file
 * value to give Google. */
export function renderSitemapIndex(locs: string[], lastmod: string): string {
  const body = locs
    .map((loc) => `<sitemap><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></sitemap>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
