'use server';

import { API_BASE } from '@/lib/api';
import type { LocationSuggestion } from '@/lib/types';

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
