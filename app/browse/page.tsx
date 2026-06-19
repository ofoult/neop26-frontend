import { BrowseClient } from '@/components/BrowseClient';
import { BROWSE_PER_PAGE, fetchEvents } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import type { CategoryId } from '@/lib/types';

export const revalidate = 120;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { cat?: string; q?: string; where?: string; from?: string; to?: string; focus?: string };
}) {
  const cat = categoryById(searchParams.cat);
  const activeCat = (cat?.id ?? null) as CategoryId | null;
  const query = searchParams.q?.trim() || undefined;
  const where = searchParams.where?.trim() || undefined;
  const dateFrom = searchParams.from?.trim() || undefined;
  const dateTo = searchParams.to?.trim() || undefined;
  const autoFocus = searchParams.focus != null;

  // Safeguard: a selected category with no Gigsberg type has no backing data.
  // Return empty rather than falling through to `typeId: undefined`, which the
  // backend treats as "no filter" and would return the whole catalogue.
  const unmapped = cat != null && cat.typeId == null;

  // The backend handles free-text search (q) + where + type filter. Sort is
  // applied client-side over the loaded pages.
  const result = unmapped
    ? { events: [], total: 0, page: 1, perPage: BROWSE_PER_PAGE }
    : await fetchEvents({
        q: query,
        where,
        dateFrom,
        dateTo,
        typeId: cat?.typeId ?? undefined,
        perPage: BROWSE_PER_PAGE,
        revalidate,
      }).catch(() => ({ events: [], total: 0, page: 1, perPage: BROWSE_PER_PAGE }));

  return (
    <BrowseClient
      events={result.events}
      total={result.total}
      activeCat={activeCat}
      query={query}
      where={where}
      dateFrom={dateFrom}
      dateTo={dateTo}
      autoFocus={autoFocus}
    />
  );
}
