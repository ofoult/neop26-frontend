import type { MetadataRoute } from 'next';
import { API_BASE } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

const CHUNK_SIZE = 45_000;

function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}

// Every generated sitemap chunk (see app/sitemap.ts) needs to be listed
// explicitly — there's no single combined index route for a multi-file
// Next.js sitemap, so this recomputes the same chunk count from the same
// counts endpoint to stay in sync automatically as the catalogue grows.
async function sitemapUrls(): Promise<string[]> {
  let counts = { events: 0, performers: 0 };
  try {
    const res = await fetch(`${API_BASE}/sitemap/counts`, { next: { revalidate } });
    if (res.ok) counts = (await res.json()) as { events: number; performers: number };
  } catch {
    // Backend unreachable — fall back to just the static-page sitemap chunk.
  }
  const total = 1 + chunkCount(counts.performers) + chunkCount(counts.events);
  return Array.from({ length: total }, (_, id) => `${SITE_URL}/sitemap/${id}.xml`);
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Transactional, per-user flows — no SEO value, and the checkout
      // step carries order details in the query string.
      disallow: ['/checkout', '/confirmation'],
    },
    sitemap: await sitemapUrls(),
    host: SITE_URL,
  };
}
