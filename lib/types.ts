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
  performer1_id: string | null;
  performer2_id: string | null;
  /** How many (filtered) events feature this performer — listings return one row per performer. */
  performer_event_count?: number;
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
  /** When we first synced this listing from Gigsberg — used as an offers.validFrom proxy (no real on-sale date exists). */
  source_created_at: string | null;
}

export interface ApiEventsResponse {
  total: number;
  page: number;
  per_page: number;
  items: ApiEventListItem[];
}

/** One ticket category with aggregated pricing, from `GET /events/:id/listings`. */
export interface ApiListingCategory {
  id: string;
  name: string;
  fromPrice: number;
  maxPrice: number;
  currency: string | null;
  available: number;
  /** Max seats buyable in one order (the checkoutUrl listing's quantity). */
  maxQuantity: number;
  /** Split rule of the checkout listing: "any" | "none" | "pairs" | "dont_leave_one" | … */
  splitType: string | null;
  listings: number;
  ticketTypes: string[];
  checkoutUrl: string | null;
}

export interface ApiEventListings {
  eventId: number;
  total: number;
  categories: ApiListingCategory[];
}

/** Seating plan (venue map) category/block legend entry, from `GET /events/:id/seating-plan`. */
export interface ApiSeatingPlanCategory {
  id: number;
  name: string;
  blocks: string[];
  color: string | null;
}

export interface ApiEventSeatingPlan {
  eventId: number;
  name: string;
  svgUrl: string;
  categories: ApiSeatingPlanCategory[];
}

/** One row from `GET /performers/:id` — a minimal projection for the listing. */
export interface ApiPerformerEventItem {
  id: string;
  name: string | null;
  event_date: string | null;
  event_time: string | null;
  timezone: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
}

/** One comment surfaced from the performer's enriched YouTube video. */
export interface ApiPerformerComment {
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface ApiPerformerResponse {
  performer: {
    id: number;
    name: string | null;
    image: string | null;
    /** Real bio text (Last.fm, falling back to Wikipedia) — null until `pnpm enrich` has run for this performer. */
    bio: string | null;
    bioSource: 'lastfm' | 'wikipedia' | null;
    bioSourceUrl: string | null;
    /** A representative YouTube video for this performer, found by the enrichment job. */
    videoId: string | null;
    videoTitle: string | null;
    comments: ApiPerformerComment[];
  };
  events: ApiPerformerEventItem[];
}

/** One row from `GET /venues/:id` — includes the performer, since a venue hosts many. */
export interface ApiVenueEventItem {
  id: string;
  name: string | null;
  event_date: string | null;
  event_time: string | null;
  timezone: string | null;
  city: string | null;
  country: string | null;
  performer1: string | null;
  performer1_id: string | null;
  performer2: string | null;
  image: string | null;
}

export interface ApiVenueResponse {
  venue: { id: number; name: string | null; city: string | null; country: string | null };
  /** May be empty — a venue with no upcoming shows still resolves, unlike a performer. */
  events: ApiVenueEventItem[];
}

// ===== neop domain model (what the UI renders) =====

export type CategoryId = 'music' | 'festivals' | 'sports' | 'arts' | 'comedy';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  /** Gigsberg type_id this category maps to (null when no backend type exists). */
  typeId: number | null;
  color: string; /** allow color tuning for categories , not gigsberg related */
}

export interface LocationSuggestion {
  type: 'city' | 'country';
  value: string;
  /** For cities: the country it belongs to. */
  country?: string | null;
  count: number;
}

/** One row from `GET /search/suggest` — the home search's "What" field autosuggest. */
export interface SearchSuggestion {
  type: 'event' | 'performer' | 'venue';
  id: string;
  label: string;
  sublabel?: string;
  /** Only for type "event" when it has a known performer — routes to the performer page instead. */
  performerId?: string;
  /** Event only — used to build the canonical slug client-side (performer name if performerId is set, else the event's own artist name for its own slug). */
  performerName?: string;
  /** Event only — used to build the event's own canonical slug. */
  city?: string;
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
  /** How many other upcoming events feature this performer. */
  performerEventCount: number;
  /** performer1_id, falling back to performer2_id; null when the event has neither. */
  performerId: string | null;
  /** When we first synced this listing (detail rows only) — used as an offers.validFrom proxy. */
  createdAt: string | null;
}
