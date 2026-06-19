'use server';

import { BROWSE_PER_PAGE, fetchEvents } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import type { CategoryId, NeopEvent } from '@/lib/types';

/**
 * Server action used by the browse grid's infinite scroll. Runs the backend
 * fetch server-side (so no CORS / public API exposure) and returns the next
 * page of adapted events.
 */
export async function loadMoreEvents(
  cat: CategoryId | null,
  page: number,
): Promise<{ events: NeopEvent[]; total: number; page: number }> {
  const catObj = cat ? categoryById(cat) : undefined;
  // Safeguard: an unmapped category (no Gigsberg type) must never fall through
  // to an unfiltered fetch. Mirrors the guard in browse/page.tsx.
  if (catObj && catObj.typeId == null) {
    return { events: [], total: 0, page };
  }
  const result = await fetchEvents({
    typeId: catObj?.typeId ?? undefined,
    page,
    perPage: BROWSE_PER_PAGE,
    revalidate: 120,
  });
  return { events: result.events, total: result.total, page };
}
