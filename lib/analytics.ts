/**
 * Google Analytics 4 journey tracking. Everything goes through `track()`, which
 * stamps each event with where the visitor is in their session (page type,
 * landing page type, how many pages they've seen) so any event — above all
 * `begin_checkout` and `event_exit_no_checkout` — can be broken down by how the
 * visitor got there. The full event/parameter catalogue, and what has to be
 * registered in the GA admin, is in docs/analytics.md — keep it in sync.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

type Params = Record<string, unknown>;

export type PageType =
  | 'home'
  | 'browse'
  | 'event'
  | 'performer'
  | 'venue'
  | 'map'
  | 'checkout'
  | 'confirmation'
  | 'static';

const LOCALE_PREFIX = /^\/[a-z]{2}(?=\/|$)/;
const STATIC_PAGES = new Set(['about', 'help', 'faq', 'partners', 'privacy', 'terms', 'cookies', 'sitemap']);

/** A site path without its `/xx` locale prefix, so every language reports the same URL. */
export function stripLocale(path: string): string {
  return path.replace(LOCALE_PREFIX, '') || '/';
}

/** Classifies a site path (with or without its `/xx` locale prefix) into a page type. */
export function pageTypeOf(path: string): PageType {
  const first = path.replace(LOCALE_PREFIX, '').split(/[/?#]/)[1] ?? '';
  if (first === '') return 'home';
  if (STATIC_PAGES.has(first)) return 'static';
  if (['browse', 'event', 'performer', 'venue', 'map', 'checkout', 'confirmation'].includes(first)) {
    return first as PageType;
  }
  return 'static';
}

// ---------- session context (per tab, survives reloads) ----------

const SESSION_KEY = 'neop_journey';

interface Journey {
  landingPageType: PageType;
  pages: number;
  /** Event pages opened this session. */
  eventsViewed: number;
}

let journey: Journey | null = null;
let currentPageType: PageType | undefined;
let currentPath: string | undefined;

function loadJourney(): Journey | null {
  if (journey) return journey;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw) journey = JSON.parse(raw) as Journey;
  } catch {
    // Storage blocked: the journey just lives in memory for this page load.
  }
  return journey;
}

function saveJourney() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(journey));
  } catch {
    // See loadJourney.
  }
}

/** Called on every page (route) change, before that page's own events fire. */
export function enterPage(path: string) {
  // Same path twice in a row is React re-running the effect (StrictMode), not a new page.
  if (typeof window === 'undefined' || path === currentPath) return;
  currentPath = path;
  currentPageType = pageTypeOf(path);
  const j = loadJourney() ?? { landingPageType: currentPageType, pages: 0, eventsViewed: 0 };
  j.pages += 1;
  if (currentPageType === 'event') j.eventsViewed += 1;
  journey = j;
  saveJourney();
}

// ---------- sending ----------

const pending: Array<[string, Params]> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushTries = 0;

// gtag is defined by an afterInteractive script, which can land after the first
// client effects: hold early events for up to ~10 s rather than dropping them.
function flush() {
  flushTimer = null;
  if (typeof window.gtag !== 'function') {
    if (++flushTries < 40) flushTimer = setTimeout(flush, 250);
    else pending.length = 0;
    return;
  }
  for (const [name, params] of pending.splice(0)) window.gtag('event', name, params);
}

/**
 * Where the visitor is in their session. `track()` adds it to every event; take
 * a snapshot yourself only to report something after the page has changed.
 */
export function journeyContext(): Params {
  if (typeof window === 'undefined') return {};
  const j = loadJourney();
  return {
    page_type: currentPageType ?? pageTypeOf(window.location.pathname),
    landing_page_type: j?.landingPageType,
    session_page_index: j?.pages,
    events_viewed: j?.eventsViewed,
  };
}

/** Sends a GA4 event, stamped with the session context. Safe to call anywhere on the client. */
export function track(name: string, params: Params = {}) {
  if (typeof window === 'undefined') return;
  const full: Params = { ...journeyContext(), ...params };
  for (const k of Object.keys(full)) if (full[k] === undefined || full[k] === null) delete full[k];
  pending.push([name, full]);
  if (!flushTimer) flush();
  // Tags the Microsoft Clarity recording too, so sessions can be filtered by what happened in them.
  try {
    window.clarity?.('event', name);
  } catch {
    // Clarity is optional.
  }
}

/** Sets GA4 user properties (register them as user-scoped custom dimensions). */
export function setUserProperties(props: Params) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') window.gtag('set', 'user_properties', props);
  else setTimeout(() => window.gtag?.('set', 'user_properties', props), 3000);
}

// ---------- ticket funnel ----------

/** What the ticket panel is offering: priced categories, only a general Gigsberg link, or nothing. */
export type TicketsState = 'listings' | 'general_link' | 'unavailable';

interface TicketedEvent {
  id: string;
  title: string;
  category?: string;
  city?: string;
  country?: string;
  /** Naive local datetime of the event. */
  date?: string;
}

function eventParams(ev: TicketedEvent): Params {
  const days = ev.date ? Math.round((new Date(ev.date).getTime() - Date.now()) / 86_400_000) : undefined;
  return {
    event_id: ev.id,
    event_title: ev.title,
    event_category: ev.category,
    event_city: ev.city,
    event_country: ev.country,
    days_until_event: Number.isFinite(days) ? days : undefined,
  };
}

function item(ev: TicketedEvent, extra: Params = {}): Params {
  return { item_id: ev.id, item_name: ev.title, item_category: ev.category, ...extra };
}

interface TicketOffer {
  state: TicketsState;
  /** Cheapest price on offer, in `currency`. */
  minPrice: number | null;
  currency: string;
  /** Number of priced categories. */
  categories: number;
  /** Total tickets available across the categories. */
  ticketsAvailable: number;
  hasSeatingPlan: boolean;
}

/** An event page's ticket panel is on screen: GA4 `view_item`, plus `tickets_unavailable` when there's nothing to buy. */
export function trackEventView(ev: TicketedEvent, offer: TicketOffer) {
  const params = {
    ...eventParams(ev),
    currency: offer.currency,
    value: offer.minPrice ?? undefined,
    tickets_state: offer.state,
    listing_categories: offer.categories,
    tickets_available: offer.ticketsAvailable,
    has_seating_plan: offer.hasSeatingPlan,
    items: [item(ev, { price: offer.minPrice ?? undefined })],
  };
  track('view_item', params);
  if (offer.state === 'unavailable') track('tickets_unavailable', eventParams(ev));
}

/** The visitor picked a ticket category / seat count (from its row or by clicking the seating plan). */
export function trackTicketSelect(
  ev: TicketedEvent,
  sel: { category: string; price: number; quantity: number; currency: string; source: 'row' | 'seat_map' },
) {
  track('select_item', {
    ...eventParams(ev),
    currency: sel.currency,
    ticket_category: sel.category,
    seats: sel.quantity,
    selection_source: sel.source,
    items: [item(ev, { item_variant: sel.category, price: sel.price, quantity: sel.quantity })],
  });
}

export function trackTicketFilter(ev: TicketedEvent, filterType: 'quantity' | 'category' | 'ticket_type' | 'clear', value?: string | number) {
  track('ticket_filter', { ...eventParams(ev), filter_type: filterType, filter_value: value != null ? String(value) : undefined });
}

interface GigsbergRedirect {
  ev: TicketedEvent;
  /** Category (seat section) the tickets belong to, when known. */
  category?: string;
  /** Price per ticket, in `currency`. */
  price: number | null;
  /** Number of seats selected, when known. */
  quantity?: number;
  /** ISO 4217 code of `price`. */
  currency: string;
  /** 1-based position of the category in the list as displayed. */
  position?: number;
  /** Seconds between the ticket panel appearing and this click. */
  secondsOnPage?: number;
}

/**
 * Reports that the user is being sent to Gigsberg to buy tickets, as GA4's
 * recommended `begin_checkout` event (mark it as a key event in GA to count it
 * as a conversion). `value` is the order total (price × seats).
 */
export function trackGigsbergRedirect({ ev, category, price, quantity, currency, position, secondsOnPage }: GigsbergRedirect) {
  const qty = quantity && quantity > 0 ? quantity : 1;
  const value = price != null ? Math.round(price * qty * 100) / 100 : undefined;
  track('begin_checkout', {
    ...eventParams(ev),
    currency,
    value,
    // Kept under its original name too, for reports built before `event_title` existed.
    event_name: ev.title,
    ticket_category: category,
    seats: quantity,
    category_position: position,
    seconds_on_page: secondsOnPage,
    checkout_type: category ? 'category' : 'general_link',
    destination: 'gigsberg',
    items: [item(ev, { item_variant: category, price: price ?? undefined, quantity: qty })],
  });
}

interface EventExit {
  ev: TicketedEvent;
  state: TicketsState;
  minPrice: number | null;
  currency: string;
  secondsOnPage: number;
  maxScrollPct: number;
  /** Deepest step reached: nothing, used a filter / the seating plan, or picked a category. */
  furthestStep: 'viewed' | 'explored' | 'selected';
  /** `journeyContext()` captured while still on the event page. */
  context: Params;
}

/** The visitor left an event page without going to Gigsberg — the "why not" side of the funnel. */
export function trackEventExitWithoutCheckout(x: EventExit) {
  track('event_exit_no_checkout', {
    ...x.context,
    ...eventParams(x.ev),
    currency: x.currency,
    value: x.minPrice ?? undefined,
    tickets_state: x.state,
    seconds_on_page: x.secondsOnPage,
    max_scroll_pct: x.maxScrollPct,
    furthest_step: x.furthestStep,
  });
}

// ---------- scroll ----------

/** Furthest point of the page seen so far, as a 0–100 percentage. */
export function scrollPct(): number {
  const doc = document.documentElement;
  const total = doc.scrollHeight;
  if (total <= 0) return 0;
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / total) * 100));
}
