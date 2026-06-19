// ===== Backend (Gigsberg) shapes, as returned by the neop backend API =====

/** A row from `GET /events` (listing projection). */
export interface ApiEventListItem {
  id: string;
  name: string | null;
  type_name: string | null;
  subtype: string | null;
  event_date: string | null; // ISO date, e.g. "2026-06-19T00:00:00.000Z"
  event_time: string | null; // "20:00:00"
  timezone: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  performer1: string | null;
  performer2: string | null;
  min_price: number | string | null;
  url: string | null;
  image: string | null;
}

/** A row from `GET /events/:id` (full record, includes type_id + raw). */
export interface ApiEventDetail extends ApiEventListItem {
  type_id: number | null;
  subtype_id: number | null;
  full_date: string | null;
  venue_id: string | null;
  categories: unknown;
  raw: unknown;
}

export interface ApiEventsResponse {
  total: number;
  page: number;
  per_page: number;
  items: ApiEventListItem[];
}

// ===== neop domain model (what the UI renders) =====

export type CategoryId = 'music' | 'festivals' | 'sports' | 'arts' | 'comedy';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  /** Gigsberg type_id this category maps to (null when no backend type exists). */
  typeId: number | null;
}

export interface NeopEvent {
  id: string;
  title: string;
  artist: string;
  category: CategoryId;
  genre: string;
  venue: string;
  city: string;
  country: string;
  /** Naive local datetime string, e.g. "2026-06-19T20:00:00". */
  date: string;
  /** Lowest known price, or null when the backend has none for this event. */
  priceFrom: number | null;
  currency: string;
  hot: boolean;
  image: string | null;
  blurb: string;
  lineup: string[];
  /** Original Gigsberg purchase URL (carries the neop affiliate tag). */
  url: string | null;
}
