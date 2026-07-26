'use server';

import { API_BASE } from '@/lib/api';
import type { LocationSuggestion, SearchSuggestion } from '@/lib/types';

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
