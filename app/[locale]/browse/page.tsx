import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { BrowseClient } from '@/components/BrowseClient';
import { BROWSE_PER_PAGE, fetchEvents } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import { hreflangAlternates, localePath } from '@/lib/hreflang';
import type { CategoryId } from '@/lib/types';

export const revalidate = 120;

type BrowseSearchParams = { cat?: string; q?: string; where?: string; from?: string; to?: string; focus?: string; page?: string };

// Canonical/hreflang cover only { cat, page } — the dimensions the sitemap
// actually lists (see app/sitemap.ts's staticEntries). q/where/from/to/focus
// are free-text search and UI state, not distinct category pages: letting
// every search-term combination self-canonicalize would spread ranking
// signal across near-infinite near-duplicate URLs instead of consolidating
// it onto the handful of real category pages Google should index.
function canonicalBrowsePath(searchParams: BrowseSearchParams): string {
  const cat = categoryById(searchParams.cat);
  const page = Math.max(1, Math.trunc(Number(searchParams.page)) || 1);
  const params = new URLSearchParams();
  if (cat) params.set('cat', cat.id);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/browse?${qs}` : '/browse';
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: BrowseSearchParams;
}): Promise<Metadata> {
  const path = canonicalBrowsePath(searchParams);
  return {
    alternates: {
      canonical: localePath(path, params.locale),
      languages: hreflangAlternates(path),
    },
  };
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: BrowseSearchParams;
}) {
  setRequestLocale(params.locale);
  const cat = categoryById(searchParams.cat);
  const activeCat = (cat?.id ?? null) as CategoryId | null;
  const query = searchParams.q?.trim() || undefined;
  const where = searchParams.where?.trim() || undefined;
  const dateFrom = searchParams.from?.trim() || undefined;
  const dateTo = searchParams.to?.trim() || undefined;
  const autoFocus = searchParams.focus != null;
  // Direct/crawled hits on ?page=N SSR that exact page, instead of always
  // page 1 — this is what makes /browse?page=2, /browse?page=3… crawlable as
  // real, independently-fetchable URLs (see the pagination nav in
  // BrowseClient), on top of the infinite-scroll UX for JS users.
  const page = Math.max(1, Math.trunc(Number(searchParams.page)) || 1);

  // Safeguard: a selected category with no Gigsberg type has no backing data.
  // Return empty rather than falling through to `typeId: undefined`, which the
  // backend treats as "no filter" and would return the whole catalogue.
  const unmapped = cat != null && cat.typeId == null;

  // The backend handles free-text search (q) + where + type filter. Sort is
  // applied client-side over the loaded pages.
  const result = unmapped
    ? { events: [], total: 0, page, perPage: BROWSE_PER_PAGE }
    : await fetchEvents({
        q: query,
        where,
        dateFrom,
        dateTo,
        typeId: cat?.typeId ?? undefined,
        page,
        perPage: BROWSE_PER_PAGE,
        revalidate,
      }).catch(() => ({ events: [], total: 0, page, perPage: BROWSE_PER_PAGE }));

  return (
    <BrowseClient
      events={result.events}
      total={result.total}
      page={result.page}
      activeCat={activeCat}
      query={query}
      where={where}
      dateFrom={dateFrom}
      dateTo={dateTo}
      autoFocus={autoFocus}
    />
  );
}
