// Data for the /map events globe, fetched by the browser from our own
// /api/geo (app/api/geo/route.ts), which proxies + caches the backend's
// GET /geo/events. Coordinates come from the backend's `pnpm enrich:geo`
// (OpenStreetMap Nominatim).

import { categoryFromType } from './categories';
import type { CategoryId } from './types';

export interface GeoVenue {
  id: number;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** false = only the city is known; the pin sits on the city centre. */
  precise: boolean;
}

export interface GeoEvent {
  id: number;
  /** Index into GeoData.venues. */
  venue: number;
  category: CategoryId;
  /** YYYY-MM-DD (local to the event). */
  date: string;
  /** HH:MM or null. */
  time: string | null;
  price: number | null;
  title: string;
  artist: string;
}

export interface GeoData {
  venues: GeoVenue[];
  events: GeoEvent[];
  unplaced: number;
}

type RawVenue = [number, string | null, string | null, string | null, number, number, 0 | 1];
type RawEvent = [number, number, number | null, string | null, string | null, number | null, string | null, string | null];

export async function fetchGeoData(signal?: AbortSignal): Promise<GeoData> {
  const res = await fetch('/api/geo', { signal });
  if (!res.ok) throw new Error(`/api/geo HTTP ${res.status}`);
  const raw = (await res.json()) as { venues: RawVenue[]; events: RawEvent[]; unplaced: number };

  const venues: GeoVenue[] = raw.venues.map(([id, name, city, country, lat, lng, precise]) => ({
    id,
    name: name || 'Venue TBA',
    city: city || '',
    country: country || '',
    lat,
    lng,
    precise: precise === 1,
  }));
  const events: GeoEvent[] = [];
  for (const [id, venue, typeId, date, time, price, name, performer] of raw.events) {
    if (!date) continue;
    const artist = performer || name || 'Live event';
    events.push({
      id,
      venue,
      category: categoryFromType(typeId, null),
      date,
      time,
      price,
      title: name || artist,
      artist,
    });
  }
  return { venues, events, unplaced: raw.unplaced ?? 0 };
}

/** Local YYYY-MM-DD for `days` from today — compared as strings against GeoEvent.date. */
export function isoDayFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Case/accent-insensitive key for the client-side city/venue search. */
export function searchKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
