// One chunk of one resource type in one language, e.g. type=performer,
// lang=fr, chunk=3 → sitemap-performer-fr-3.xml (see middleware.ts's rewrite
// and lib/sitemap.ts's filename scheme). Each <url> is a single localized
// <loc> — no hreflang alternates (see lib/sitemap.ts's CHUNK_SIZE comment
// for why those were dropped).

import { API_BASE } from '@/lib/api';
import { routing } from '@/i18n/routing';
import { localePath } from '@/lib/hreflang';
import { eventHref, performerHref, venueHref } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';
import {
  allSitemapChunks,
  CHUNK_SIZE,
  getSitemapCounts,
  SITEMAP_RESOURCE_TYPES,
  SITEMAP_TAG,
  type SitemapResourceType,
} from '@/lib/sitemap';
import { renderUrlset, xmlResponse, type SitemapUrlEntry } from '@/lib/sitemapXml';

// Anything not pre-rendered by generateStaticParams below (a guessed chunk
// number, an unsupported type/lang) 404s instead of falling back to
// rendering on demand — keeps every visitor and crawler request served from
// the static cache, never dependent on the backend being awake.
export const dynamicParams = false;

interface Params {
  type: string;
  lang: string;
  chunk: string;
}

interface SitemapEventRow {
  id: number;
  name: string | null;
  performer1: string | null;
  performer2: string | null;
  city: string | null;
  event_date: string | null;
  source_updated_at: string | null;
}

interface SitemapPerformerRow {
  id: number;
  name: string | null;
}

interface SitemapVenueRow {
  id: number;
  name: string | null;
}

export async function generateStaticParams(): Promise<Params[]> {
  const counts = await getSitemapCounts();
  return allSitemapChunks(counts).map((c) => ({ type: c.type, lang: c.lang, chunk: String(c.chunkOneBased) }));
}

function isResourceType(value: string): value is SitemapResourceType {
  return (SITEMAP_RESOURCE_TYPES as string[]).includes(value);
}

async function performerEntries(offset: number, lang: string): Promise<SitemapUrlEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/sitemap/performers?offset=${offset}&limit=${CHUNK_SIZE}`, {
      next: { revalidate: false, tags: [SITEMAP_TAG] },
    });
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: SitemapPerformerRow[] };
    return items.map((p) => ({ loc: `${SITE_URL}${localePath(performerHref(p.id, p.name), lang)}` }));
  } catch {
    return [];
  }
}

async function venueEntries(offset: number, lang: string): Promise<SitemapUrlEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/sitemap/venues?offset=${offset}&limit=${CHUNK_SIZE}`, {
      next: { revalidate: false, tags: [SITEMAP_TAG] },
    });
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: SitemapVenueRow[] };
    return items.map((v) => ({ loc: `${SITE_URL}${localePath(venueHref(v.id, v.name), lang)}` }));
  } catch {
    return [];
  }
}

async function eventEntries(offset: number, lang: string): Promise<SitemapUrlEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/sitemap/events?offset=${offset}&limit=${CHUNK_SIZE}`, {
      next: { revalidate: false, tags: [SITEMAP_TAG] },
    });
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: SitemapEventRow[] };
    return items.map((e) => {
      const artist = e.performer1 || e.name || 'event';
      const title = e.name || artist;
      const path = eventHref({ id: e.id, title, artist, city: e.city || '' });
      return {
        loc: `${SITE_URL}${localePath(path, lang)}`,
        lastmod: e.source_updated_at ? new Date(e.source_updated_at).toISOString() : undefined,
      };
    });
  } catch {
    return [];
  }
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { type, lang, chunk } = params;
  const chunkOneBased = Number(chunk);
  if (!isResourceType(type) || !(routing.locales as readonly string[]).includes(lang) || !Number.isInteger(chunkOneBased) || chunkOneBased < 1) {
    return new Response('Not found', { status: 404 });
  }

  const offset = (chunkOneBased - 1) * CHUNK_SIZE;
  const entries =
    type === 'performer'
      ? await performerEntries(offset, lang)
      : type === 'venue'
        ? await venueEntries(offset, lang)
        : await eventEntries(offset, lang);

  return xmlResponse(renderUrlset(entries));
}
