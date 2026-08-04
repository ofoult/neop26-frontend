import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BrowseClient } from '@/components/BrowseClient';
import { BROWSE_PER_PAGE, fetchEvents, fetchSubtypes } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import { findSubcategory, subcategoriesByCategory, toSubcategories, type Subcategory } from '@/lib/subcategories';
import { hreflangAlternates, localePath } from '@/lib/hreflang';
import type { CategoryId } from '@/lib/types';

export const revalidate = 120;

type BrowseSlugSearchParams = { q?: string; where?: string; from?: string; to?: string; focus?: string; page?: string };

// Canonical/hreflang cover only { slug, page } — same rationale as the bare
// /browse route (see its own canonicalBrowsePath comment): q/where/from/to
// are free-text search/UI state, not distinct indexable pages.
function canonicalSlugPath(slug: string, searchParams: BrowseSlugSearchParams): string {
  const page = Math.max(1, Math.trunc(Number(searchParams.page)) || 1);
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/browse/${slug}?${qs}` : `/browse/${slug}`;
}

/** Resolves a /browse/{slug} path segment against categories first, then the
 * (dynamic, backend-driven) subcategory taxonomy. Shared by the page and
 * generateMetadata so Next.js dedupes the identical fetchSubtypes() call. */
async function resolveSlug(slug: string): Promise<
  | { activeCat: CategoryId; typeId: number | null; activeSubcat: null; subcategories: Subcategory[] }
  | { activeCat: CategoryId; typeId: number; activeSubcat: Subcategory; subcategories: Subcategory[] }
  | null
> {
  const cat = categoryById(slug);
  const subs = toSubcategories(await fetchSubtypes());
  const byCategory = subcategoriesByCategory(subs);

  if (cat) {
    return { activeCat: cat.id, typeId: cat.typeId, activeSubcat: null, subcategories: byCategory[cat.id] ?? [] };
  }

  const subcat = findSubcategory(subs, slug);
  if (!subcat) return null;
  return { activeCat: subcat.categoryId, typeId: subcat.typeId, activeSubcat: subcat, subcategories: byCategory[subcat.categoryId] ?? [] };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string; slug: string };
  searchParams: BrowseSlugSearchParams;
}): Promise<Metadata> {
  const resolved = await resolveSlug(params.slug);
  if (!resolved) return {};
  const path = canonicalSlugPath(params.slug, searchParams);
  return {
    alternates: {
      canonical: localePath(path, params.locale),
      languages: hreflangAlternates(path),
    },
  };
}

export default async function BrowseSlugPage({
  params,
  searchParams,
}: {
  params: { locale: string; slug: string };
  searchParams: BrowseSlugSearchParams;
}) {
  setRequestLocale(params.locale);

  const resolved = await resolveSlug(params.slug);
  if (!resolved) notFound();
  const { activeCat, typeId, activeSubcat, subcategories } = resolved;

  const query = searchParams.q?.trim() || undefined;
  const where = searchParams.where?.trim() || undefined;
  const dateFrom = searchParams.from?.trim() || undefined;
  const dateTo = searchParams.to?.trim() || undefined;
  const autoFocus = searchParams.focus != null;
  const page = Math.max(1, Math.trunc(Number(searchParams.page)) || 1);

  // Safeguard: a category with no Gigsberg type has no backing data. Return
  // empty rather than falling through to `typeId: undefined`, which the
  // backend treats as "no filter" and would return the whole catalogue.
  const unmapped = typeId == null;

  const result = unmapped
    ? { events: [], total: 0, page, perPage: BROWSE_PER_PAGE }
    : await fetchEvents({
        q: query,
        where,
        dateFrom,
        dateTo,
        typeId,
        subtypeId: activeSubcat?.id ?? undefined,
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
      activeSubcat={activeSubcat}
      subcategories={subcategories}
      query={query}
      where={where}
      dateFrom={dateFrom}
      dateTo={dateTo}
      autoFocus={autoFocus}
    />
  );
}
