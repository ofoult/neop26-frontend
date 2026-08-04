// The fixed/bounded set of pages (home, /browse, category and subcategory
// pages) across every locale, combined into one file — small enough (a few
// dozen paths × 14 locales) that splitting it per language like the
// performer/event/venue chunks would just create near-duplicate tiny files
// for no benefit. Reached via middleware.ts's rewrite of /sitemap-static.xml.

import { API_BASE } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { localePath } from '@/lib/hreflang';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import { SITEMAP_TAG } from '@/lib/sitemap';
import { renderUrlset, xmlResponse, type SitemapUrlEntry } from '@/lib/sitemapXml';
import { toSubcategories, type Subcategory } from '@/lib/subcategories';
import type { ApiSubtype } from '@/lib/types';

async function getSubcategories(): Promise<Subcategory[]> {
  try {
    const res = await fetch(`${API_BASE}/subtypes`, { next: { revalidate: false, tags: [SITEMAP_TAG] } });
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: ApiSubtype[] };
    return toSubcategories(items);
  } catch {
    return [];
  }
}

interface FixedPath {
  path: string;
  changefreq: string;
  priority: number;
}

export async function GET() {
  const subcategories = await getSubcategories();
  const fixedPaths: FixedPath[] = [
    { path: '/', changefreq: 'hourly', priority: 1 },
    { path: '/browse', changefreq: 'hourly', priority: 0.9 },
    ...CATEGORIES.map((c) => ({ path: `/browse/${c.id}`, changefreq: 'hourly', priority: 0.8 })),
    ...subcategories.map((s) => ({ path: `/browse/${s.slug}`, changefreq: 'hourly', priority: 0.7 })),
  ];

  const entries: SitemapUrlEntry[] = [];
  for (const { path, changefreq, priority } of fixedPaths) {
    for (const lang of routing.locales) {
      entries.push({ loc: `${SITE_URL}${localePath(path, lang)}`, changefreq, priority });
    }
  }

  return xmlResponse(renderUrlset(entries));
}
