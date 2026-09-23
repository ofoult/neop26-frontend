'use server';

import { API_BASE, fetchEventListings, fetchSubtypes } from '@/lib/api';
import { toSubcategories, type Subcategory } from '@/lib/subcategories';
import { CURRENCY_CODES } from '@/lib/languageCurrency';
import type { ApiListingCategory, LocationSuggestion, SearchSuggestion } from '@/lib/types';

/**
 * Location autocomplete for the search bar's "Where" field. Calls the backend
 * server-side (so no CORS), returning matching towns and countries.
 */
export async function suggestLocations(q: string): Promise<LocationSuggestion[]> {
  const term = q.trim();
  if (!term) return [];
  try {
    const url = `${API_BASE}/locations?q=${encodeURIComponent(term)}&limit=8`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions?: LocationSuggestion[] };
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

/**
 * Autosuggest for the search bar's "What" field — mixed events/performers/venues.
 * Shorter revalidate window than suggestLocations: event/performer listings
 * change far more often than city/country names do.
 */
export async function suggestSearch(q: string): Promise<SearchSuggestion[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  try {
    const url = `${API_BASE}/search/suggest?q=${encodeURIComponent(term)}&limit=8`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions?: SearchSuggestion[] };
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

/**
 * The full subcategory taxonomy, for client components that need it on
 * demand — the Nav category submenu calls this lazily on first hover rather
 * than fetching it on every page load (see components/Nav.tsx).
 */
export async function getSubcategories(): Promise<Subcategory[]> {
  return toSubcategories(await fetchSubtypes());
}

/**
 * An event's ticket categories priced in the visitor's chosen display currency
 * (Gigsberg does the conversion, so the price matches its checkout). Returns
 * null — never [] — on failure or an unsupported currency, so the caller can
 * tell "no data" apart from "no tickets" and keep the prices it already has.
 */
export async function fetchListingsInCurrency(
  eventId: string,
  currency: string,
): Promise<ApiListingCategory[] | null> {
  if (!CURRENCY_CODES.includes(currency)) return null;
  const categories = await fetchEventListings(eventId, 60, currency);
  return categories.length > 0 ? categories : null;
}
