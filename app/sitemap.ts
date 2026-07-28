import type { MetadataRoute } from 'next';
import { API_BASE } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { hreflangAlternatesAbsolute } from '@/lib/hreflang';
import { eventHref, performerHref, venueHref } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';

// Prerendered at build time and only regenerated on-demand (see
// app/api/revalidate-sitemap/route.ts, called by the daily sync job once new
// data lands) rather than on a runtime timer — that decouples every visitor's
// (and Googlebot's) request from the backend's liveness entirely. Every fetch
// below is cached indefinitely (`revalidate: false`), which is what makes
// this route static; confirmed static (SSG) in `next build` output. Note:
// `next dev` 404s these multi-file sitemap routes regardless (true of the
// pre-existing code too, not something this change caused) — verify with a
// real build (`pnpm build && pnpm start`), not `next dev`.
// Shared cache tag for every backend fetch below, so a single
// `revalidateTag('sitemap')` call refreshes all of them together.
const SITEMAP_TAG = 'sitemap';

// Google enforces a 50,000 URL/file limit on sitemaps; this stays comfortably
// under it (and under the backend's own per-request cap, see
// backend/src/routes/sitemap.ts) while keeping each chunk a single request.
const CHUNK_SIZE = 45_000;

interface Counts {
  events: number;
  performers: number;
  venues: number;
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

/** Coerces a possibly-missing/non-numeric count (e.g. a field a not-yet-deployed
 * backend doesn't return yet) to a safe integer, so it can never poison the
 * chunk-count math downstream with NaN. */
function safeCount(n: unknown): number {
  return Number.isFinite(n) ? (n as number) : 0;
}

async function getCounts(): Promise<Counts> {
  try {
    const res = await fetch(`${API_BASE}/sitemap/counts`, { next: { revalidate: false, tags: [SITEMAP_TAG] } });
    if (!res.ok) return { events: 0, performers: 0, venues: 0 };
    const raw = (await res.json()) as Partial<Counts>;
    return { events: safeCount(raw.events), performers: safeCount(raw.performers), venues: safeCount(raw.venues) };
  } catch {
    // Backend unreachable (e.g. a sleeping free-tier instance during a
    // build) — degrade to the static-only sitemap rather than failing the
    // whole build/request.
    return { events: 0, performers: 0, venues: 0 };
  }
}

/** At least 1, so the id space stays stable even when a resource is empty. */
function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}

// Multi-file sitemap: id 0 is static/category pages, the next `performerChunks`
// ids are performer chunks, the next `venueChunks` ids are venue chunks, and
// the remaining ids are event chunks. Next.js serves each id at
// /sitemap/<id>.xml; robots.ts lists them all explicitly (see app/robots.ts)
// since there's no single combined index route here.
export async function generateSitemaps() {
  const { events, performers, venues } = await getCounts();
  const total = 1 + chunkCount(performers) + chunkCount(venues) + chunkCount(events);
  return Array.from({ length: total }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const { events, performers, venues } = await getCounts();
  const performerChunks = chunkCount(performers);
  const venueChunks = chunkCount(venues);

  if (id === 0) return staticEntries();
  if (id <= performerChunks) return performerEntries(id - 1);
  if (id <= performerChunks + venueChunks) return venueEntries(id - 1 - performerChunks);
  return eventEntries(id - 1 - performerChunks - venueChunks);
}

function staticEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'hourly', priority: 1, alternates: { languages: hreflangAlternatesAbsolute('/') } },
    {
      url: `${SITE_URL}/browse`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
      alternates: { languages: hreflangAlternatesAbsolute('/browse') },
    },
    ...CATEGORIES.map((c) => ({
      url: `${SITE_URL}/browse?cat=${c.id}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
      alternates: { languages: hreflangAlternatesAbsolute(`/browse?cat=${c.id}`) },
    })),
  ];
}

async function performerEntries(chunkIndex: number): Promise<MetadataRoute.Sitemap> {
  const offset = chunkIndex * CHUNK_SIZE;
  try {
    const res = await fetch(`${API_BASE}/sitemap/performers?offset=${offset}&limit=${CHUNK_SIZE}`, {
      next: { revalidate: false, tags: [SITEMAP_TAG] },
    });
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: SitemapPerformerRow[] };
    return items.map((p) => {
      const path = performerHref(p.id, p.name);
      return { url: `${SITE_URL}${path}`, alternates: { languages: hreflangAlternatesAbsolute(path) } };
    });
  } catch {
    return [];
  }
}

async function venueEntries(chunkIndex: number): Promise<MetadataRoute.Sitemap> {
  const offset = chunkIndex * CHUNK_SIZE;
  try {
    const res = await fetch(`${API_BASE}/sitemap/venues?offset=${offset}&limit=${CHUNK_SIZE}`, {
      next: { revalidate: false, tags: [SITEMAP_TAG] },
    });
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: SitemapVenueRow[] };
    return items.map((v) => {
      const path = venueHref(v.id, v.name);
      return { url: `${SITE_URL}${path}`, alternates: { languages: hreflangAlternatesAbsolute(path) } };
    });
  } catch {
    return [];
  }
}

async function eventEntries(chunkIndex: number): Promise<MetadataRoute.Sitemap> {
  const offset = chunkIndex * CHUNK_SIZE;
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
        url: `${SITE_URL}${path}`,
        lastModified: e.source_updated_at ? new Date(e.source_updated_at) : undefined,
        alternates: { languages: hreflangAlternatesAbsolute(path) },
      };
    });
  } catch {
    return [];
  }
}
