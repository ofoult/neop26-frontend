import { BrowseClient } from '@/components/BrowseClient';
import { fetchEvents } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import type { CategoryId } from '@/lib/types';

export const revalidate = 120;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const cat = categoryById(searchParams.cat);
  const activeCat = (cat?.id ?? null) as CategoryId | null;

  // The backend filters by Gigsberg type_id. Sort is applied client-side over
  // the returned page (the result count reflects the real catalogue total).
  const result = await fetchEvents({
    typeId: cat?.typeId ?? undefined,
    perPage: 48,
    revalidate,
  }).catch(() => ({ events: [], total: 0, page: 1, perPage: 48 }));

  return <BrowseClient events={result.events} total={result.total} activeCat={activeCat} />;
}
