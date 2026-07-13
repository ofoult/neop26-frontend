import { categoryFromType } from './categories';
import { currencyFor } from './format';
import type {
  ApiEventDetail,
  ApiEventListings,
  ApiEventListItem,
  ApiEventSeatingPlan,
  ApiEventsResponse,
  ApiListingCategory,
  CategoryId,
  NeopEvent,
} from './types';

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'
).replace(/\/$/, '');

/** Page size used by the browse grid (initial SSR load + infinite scroll). */
export const BROWSE_PER_PAGE = 48;

// ---------- adapter helpers ----------

function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Builds a naive local datetime string from the feed's separate date + time.
 * Concatenating (rather than relying on the ISO `Z`) keeps the displayed time
 * equal to the event's local listed time, consistent across list and detail.
 */
function combineDateTime(date: string | null, time: string | null): string {
  const day = (date ?? '').split('T')[0] || '1970-01-01';
  const t = time && /^\d{2}:\d{2}/.test(time) ? time : '19:00:00';
  return `${day}T${t}`;
}

function buildLineup(p1: string | null, p2: string | null): string[] {
  return [p1, p2].filter((x): x is string => !!x && x.trim().length > 0);
}

function buildBlurb(e: {
  artist: string;
  venue: string;
  city: string;
  country: string;
  category: CategoryId;
  genre: string;
}): string {
  const where = `${e.venue}${e.city ? `, ${e.city}` : ''}`;
  const intros: Record<CategoryId, string> = {
    music: `${e.artist} brings ${e.genre} to the stage at ${where}.`,
    festivals: `${e.artist} takes over ${where} for an unmissable festival.`,
    sports: `${e.artist} live at ${where} — witness it from the stands.`,
    arts: `${e.artist} comes to ${where} in a performance to remember.`,
    comedy: `${e.artist} headlines ${where} for a night of stand-up.`,
  };
  return intros[e.category];
}

// ---------- adapters ----------

export function adaptListItem(item: ApiEventListItem): NeopEvent {
  const category = categoryFromType(null, item.type_name);
  const artist = item.performer1 || item.name || 'Live event';
  const genre = item.subtype || item.type_name || 'Live';
  const city = item.city || '';
  const country = item.country || '';
  const venue = item.venue || 'Venue TBA';
  const priceFrom = toNumber(item.min_price);
  return {
    id: String(item.id),
    title: item.name || artist,
    artist,
    category,
    genre,
    venue,
    city,
    country,
    date: combineDateTime(item.event_date, item.event_time),
    priceFrom,
    currency: currencyFor(country),
    // The feed has no popularity signal; priced inventory is what neop can sell
    // and promote, so we surface those as "trending".
    hot: priceFrom != null,
    image: item.image,
    blurb: buildBlurb({ artist, venue, city, country, category, genre }),
    lineup: buildLineup(item.performer1, item.performer2),
    url: item.url,
  };
}

export function adaptDetail(item: ApiEventDetail): NeopEvent {
  const base = adaptListItem(item);
  // Detail rows carry type_id, giving a more reliable category resolution.
  return { ...base, category: categoryFromType(item.type_id, item.type_name) };
}

// ---------- fetchers ----------

export interface EventQuery {
  /** Free-text search (full-text + typo-tolerant fallback, server-side). */
  q?: string;
  /** Location term, merged into the full-text search server-side. */
  where?: string;
  /** Inclusive event_date lower bound, YYYY-MM-DD. */
  dateFrom?: string;
  /** Inclusive event_date upper bound, YYYY-MM-DD. */
  dateTo?: string;
  city?: string;
  country?: string;
  typeId?: number | null;
  page?: number;
  perPage?: number;
  /** ISR revalidation window in seconds (server components only). */
  revalidate?: number;
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

export interface EventsResult {
  total: number;
  page: number;
  perPage: number;
  events: NeopEvent[];
}

export async function fetchEvents(q: EventQuery = {}): Promise<EventsResult> {
  const url = buildUrl('/events', {
    q: q.q,
    where: q.where,
    date_from: q.dateFrom,
    date_to: q.dateTo,
    city: q.city,
    country: q.country,
    type_id: q.typeId ?? undefined,
    page: q.page ?? 1,
    per_page: q.perPage ?? 24,
  });

  const res = await fetch(url, { next: { revalidate: q.revalidate ?? 60 } });
  if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
  const data = (await res.json()) as ApiEventsResponse;
  return {
    total: data.total,
    page: data.page,
    perPage: data.per_page,
    events: (data.items ?? []).map(adaptListItem),
  };
}

// used inside the BestSaleMarquee but currently not working because of client issue ,uncomment if we end up fixing the client issue and still need this function or delete it if we don't need it anymore .
// export async function fetchTrendingEvents(revalidate = 120): Promise<NeopEvent[]> {
//   const res = await fetchEvents({ perPage: 50, revalidate });
//   return res.events.filter((event) => event.hot).slice(0, 12);
// }

export async function fetchEvent(id: string, revalidate = 60): Promise<NeopEvent | null> {
  const res = await fetch(buildUrl(`/events/${id}`, {}), { next: { revalidate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load event ${id} (${res.status})`);
  const data = (await res.json()) as ApiEventDetail;
  return adaptDetail(data);
}

/**
 * Live ticket prices grouped by category for an event. Returns [] on any
 * failure so the detail page can gracefully fall back to its other pricing.
 */
export async function fetchEventListings(id: string, revalidate = 120): Promise<ApiListingCategory[]> {
  try {
    const res = await fetch(buildUrl(`/events/${id}/listings`, {}), { next: { revalidate } });
    if (!res.ok) return [];
    const data = (await res.json()) as ApiEventListings;
    return data.categories ?? [];
  } catch {
    return [];
  }
}

/**
 * Seating plan (venue map SVG) for an event. Returns null on any failure or
 * when Gigsberg has no seating plan for it, so the detail page can just skip
 * the section.
 */
export async function fetchEventSeatingPlan(id: string, revalidate = 3600): Promise<ApiEventSeatingPlan | null> {
  try {
    const res = await fetch(buildUrl(`/events/${id}/seating-plan`, {}), { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as ApiEventSeatingPlan;
  } catch {
    return null;
  }
}

/**
 * Strips content that has no business being in a third-party SVG we're about
 * to inline via dangerouslySetInnerHTML: the XML prologue/doctype (invalid as
 * HTML, and would render as stray text) plus any <script> tags and inline
 * event-handler attributes (defense in depth against a compromised/malicious
 * asset host, even though the SVG comes from Gigsberg's own CDN).
 */
function sanitizeSvgMarkup(svg: string): string {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '');
}

/**
 * Fetches the raw seating-plan SVG markup so it can be inlined into the page
 * (rather than loaded as an opaque <img>), letting the UI target individual
 * block elements by id/data-name — needed to highlight a category's seats on
 * hover. Returns null on any failure.
 */
export async function fetchSeatingPlanSvgMarkup(url: string, revalidate = 3600): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return sanitizeSvgMarkup(await res.text());
  } catch {
    return null;
  }
}
