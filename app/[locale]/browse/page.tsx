import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BrowseClient } from '@/components/BrowseClient';
import { BROWSE_PER_PAGE, fetchEvents } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import { hreflangAlternates, localePath } from '@/lib/hreflang';

export const revalidate = 120;

type BrowseSearchParams = { cat?: string; q?: string; where?: string; from?: string; to?: string; focus?: string; page?: string };

// Canonical/hreflang cover only { page } — q/where/from/to/focus are
// free-text search and UI state, not distinct indexable pages: letting every
// search-term combination self-canonicalize would spread ranking signal
// across near-infinite near-duplicate URLs instead of consolidating it onto
// the real category/subcategory pages under /browse/{slug} that Google
// should index (see app/sitemap.ts and browse/[slug]/page.tsx).
function canonicalBrowsePath(searchParams: BrowseSearchParams): string {
  const page = Math.max(1, Math.trunc(Number(searchParams.page)) || 1);
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/browse?${qs}` : '/browse';
}

// Legacy ?cat=sports links now live at /browse/sports — redirect rather than
// 404 or silently drop the filter, preserving every other param. Bare,
// locale-unprefixed target: same convention as the canonical-slug redirects
// in event/[slug], performer/[slug], venue/[slug] (see lib/slug.ts).
function redirectLegacyCatParam(searchParams: BrowseSearchParams): void {
  const cat = categoryById(searchParams.cat);
  if (!cat) return;
  const params = new URLSearchParams();
  if (searchParams.q) params.set('q', searchParams.q);
  if (searchParams.where) params.set('where', searchParams.where);
  if (searchParams.from) params.set('from', searchParams.from);
  if (searchParams.to) params.set('to', searchParams.to);
  if (searchParams.focus != null) params.set('focus', searchParams.focus);
  if (searchParams.page) params.set('page', searchParams.page);
  const qs = params.toString();
  permanentRedirect(qs ? `/browse/${cat.id}?${qs}` : `/browse/${cat.id}`);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: BrowseSearchParams;
}): Promise<Metadata> {
  redirectLegacyCatParam(searchParams);
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
  redirectLegacyCatParam(searchParams);
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

  // No category filter here — this is the "search everything" page.
  // Category/subcategory-scoped browsing lives at /browse/{slug} (see
  // browse/[slug]/page.tsx), which is also where a legacy ?cat= redirects to.
  const result = await fetchEvents({
    q: query,
    where,
    dateFrom,
    dateTo,
    page,
    perPage: BROWSE_PER_PAGE,
    revalidate,
  }).catch(() => ({ events: [], total: 0, page, perPage: BROWSE_PER_PAGE }));

  return (
    <BrowseClient
      events={result.events}
      total={result.total}
      page={result.page}
      activeCat={null}
      activeSubcat={null}
      subcategories={[]}
      query={query}
      where={where}
      dateFrom={dateFrom}
      dateTo={dateTo}
      autoFocus={autoFocus}
    />
  );
}
