'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { loadMoreEvents } from '@/app/[locale]/browse/actions';
import { EventCard } from '@/components/EventCard';
import { Icon } from '@/components/Icon';
import { SearchBar } from '@/components/SearchBar';
import { BROWSE_PER_PAGE } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import { parseDate } from '@/lib/format';
import type { Subcategory } from '@/lib/subcategories';
import type { CategoryId, NeopEvent } from '@/lib/types';

type SortKey = 'trending' | 'price' | 'date';
const SORT_KEYS: SortKey[] = ['trending', 'price', 'date'];
const SORT_LABEL_KEY: Record<SortKey, 'sortTrending' | 'sortPrice' | 'sortDate'> = {
  trending: 'sortTrending',
  price: 'sortPrice',
  date: 'sortDate',
};

// Human label for a YYYY-MM-DD date range, e.g. "Jun 20 – Jun 28". `t` is the
// SearchBar namespace's translator, reused here since "From {date}"/"Until
// {date}" are the same phrases as the search bar's own date-range field.
function formatWhenLabel(from: string | undefined, to: string | undefined, locale: string, t: ReturnType<typeof useTranslations>): string {
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    if (!y || !m || !day) return d;
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(y, m - 1, day));
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return t('fromDate', { date: fmt(from) });
  if (to) return t('untilDate', { date: fmt(to) });
  return '';
}

// Builds a /browse or /browse/{slug} URL, preserving the active search
// filters — used both by the infinite-scroll fetch, the crawlable pagination
// links, and the subcategory select's navigation.
function browseHref(slug: string | null, { page, query, where, dateFrom, dateTo }: { page?: number; query?: string; where?: string; dateFrom?: string; dateTo?: string } = {}): string {
  const base = slug ? `/browse/${slug}` : '/browse';
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (where) params.set('where', where);
  if (dateFrom) params.set('from', dateFrom);
  if (dateTo) params.set('to', dateTo);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function BrowseClient({
  events,
  total,
  page: initialPage,
  activeCat,
  activeSubcat,
  subcategories,
  query,
  where,
  dateFrom,
  dateTo,
  autoFocus,
}: {
  events: NeopEvent[];
  total: number;
  page: number;
  activeCat: CategoryId | null;
  /** The active subcategory, when the current page is /browse/{subcategorySlug}. */
  activeSubcat: Subcategory | null;
  /** Sibling subcategories of activeCat, for the select — [] when activeCat is null. */
  subcategories: Subcategory[];
  query?: string;
  where?: string;
  dateFrom?: string;
  dateTo?: string;
  autoFocus?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('Browse');
  const tSearchBar = useTranslations('SearchBar');
  const tCat = useTranslations('Categories');
  const [sort, setSort] = useState<SortKey>('trending');
  const catObj = activeCat ? categoryById(activeCat) : undefined;
  // The path segment for the current page — a subcategory slug, a category
  // id, or null on bare /browse. Used for pagination links, the select, and
  // to keep the search bar scoped to whatever's currently active.
  const activeSlug = activeSubcat?.slug ?? activeCat;

// Pagination state. `items` starts from the server-rendered page (page 1 by
// default, or whichever page a direct ?page=N visit loads). Additional pages
// are loaded only when requested by the user.
  const [items, setItems] = useState<NeopEvent[]>(events);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const loadingRef = useRef(false);

  // Reset when the category/page (and thus the SSR payload) changes.
  useEffect(() => {
    setItems(events);
    setPage(initialPage);
    setErrored(false);
  }, [events, initialPage]);

  // `items` only holds pages loaded forward from `initialPage` (which may be
  // > 1 on a direct/crawled ?page=N hit), so compare against total *pages*
  // rather than total item count.
  const totalPages = total > 0 ? Math.ceil(total / BROWSE_PER_PAGE) : 0;
  const done = page >= totalPages;

  // Fetches the next page of events and appends it to the current list.
  const loadMore = useCallback(async () => {
    if (loadingRef.current || done || errored) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await loadMoreEvents(activeCat, next, query, where, dateFrom, dateTo, activeSubcat?.id ?? null);
      setItems((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...res.events.filter((e) => !seen.has(e.id))];
      });
      setPage(next);
    } catch {
      // Allow the user to retry after a failed request.
      setErrored(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeCat, activeSubcat, page, done, errored, query, where, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const list = [...items];
    if (sort === 'price') {
      list.sort((a, b) => (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity));
    } else if (sort === 'date') {
      list.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
    } else {
      list.sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0));
    }
    return list;
  }, [items, sort]);

  const searching = Boolean(query || where || dateFrom || dateTo);
  const searchLabel = [
    query,
    where && t('inWhere', { where }),
    formatWhenLabel(dateFrom, dateTo, locale, tSearchBar),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="browse-container"
      style={{
        maxWidth: "var(--maxw)",
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <div
          style={{ fontSize: 13.5, color: "var(--faint)", marginBottom: 10 }}
        >
          <Link href="/" style={{ color: "var(--dim)" }}>
            {t('home')}
          </Link>{" "}
          {searching
            ? ` / ${t('searchBreadcrumb')}`
            : catObj
              ? (
                <>
                  {" / "}
                  {activeSubcat ? (
                    <Link href={`/browse/${catObj.id}`} style={{ color: "var(--dim)" }}>
                      {tCat(catObj.id)}
                    </Link>
                  ) : (
                    tCat(catObj.id)
                  )}
                  {activeSubcat ? ` / ${activeSubcat.name}` : ""}
                </>
              )
              : ""}
        </div>
        <h1
          className="serif"
          style={{ fontSize: "clamp(36px,5vw,58px)", margin: 0, lineHeight: 1 }}
        >
          {searching ? (
            <>
              {t('resultsFor')}{" "}
              <span className="ital" style={{ color: "var(--dim)" }}>
                “{searchLabel}”
              </span>
            </>
          ) : activeSubcat ? (
            activeSubcat.name
          ) : catObj ? (
            tCat(catObj.id)
          ) : (
            <>
              {t('discoverEvents')}{" "}
              <span className="ital" style={{ color: "var(--dim)" }}>
                {t('worldwide')}
              </span>
            </>
          )}
        </h1>
      </div>

      {catObj && subcategories.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <CategorySelect
            label={activeSubcat ? activeSubcat.name : t('allCategory')}
            ariaLabel={t('subcategorySelectLabel', { category: tCat(catObj.id) })}
            activeValue={activeSlug ?? catObj.id}
            options={[
              { value: catObj.id, label: t('allCategory'), href: browseHref(catObj.id, { query, where, dateFrom, dateTo }) },
              ...subcategories.map((s) => ({
                value: s.slug,
                label: s.name,
                href: browseHref(s.slug, { query, where, dateFrom, dateTo }),
              })),
            ]}
          />
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <SearchBar
          compact
          activeSlug={activeSlug}
          defaultQuery={query ?? ""}
          defaultWhere={where ?? ""}
          defaultFrom={dateFrom ?? ""}
          defaultTo={dateTo ?? ""}
          autoFocus={autoFocus}
        />
      </div>

      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <span
            style={{ fontSize: 18, color: "var(--faint)", paddingInlineStart: 10 }}
          >
            {t('sort')}
          </span>
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: 4,
            }}
          >
            {SORT_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className="focus-ring"
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 16,
                  fontWeight: 600,
                  background: sort === k ? "var(--text)" : "transparent",
                  color: sort === k ? "#0a0a0f" : "var(--dim)",
                  transition: "all .2s",
                }}
              >
                {t(SORT_LABEL_KEY[k])}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 14, color: "var(--dim)", marginBottom: 18 }}>
        {t('artistsCount', { count: total })}
        {sorted.length < total ? ` · ${t('showingCount', { count: sorted.length })}` : ""}
      </div>
      {sorted.length === 0 ? (
        <div style={{ color: "var(--dim)", fontSize: 16, padding: "40px 0" }}>
          {searching
            ? t('noEventsMatch', { term: searchLabel })
            : t('noEventsInCategory')}
        </div>
      ) : (
        <>
          <div className="event-grid">
            {sorted.map((e, i) => (
              <EventCard key={e.id} ev={e} i={i} wide />
            ))}
          </div>
            {/*
              Crawlable pagination links.
              These preserve the current filters and allow both users and search engines
              to navigate directly between pages.
            */}
          {totalPages > 1 && (
            <nav
              aria-label={t('pagination')}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, padding: '38px 0 12px', fontSize: 16, flexWrap: 'wrap', textAlign: 'center' }}
            >
              {initialPage > 1 ? (
                <Link href={browseHref(activeSlug, { page: initialPage - 1, query, where, dateFrom, dateTo })} className="focus-ring" style={{ color: 'var(--dim)' }}>
                  ← {t('prev')}
                </Link>
              ) : (
                <span style={{ color: 'var(--faint)' }}>← {t('prev')}</span>
              )}
              <span style={{ color: 'var(--faint)' }}>
                {t('pageOf', { page: initialPage, total: totalPages })}
              </span>
              {initialPage < totalPages ? (
                <Link href={browseHref(activeSlug, { page: initialPage + 1, query, where, dateFrom, dateTo })} className="focus-ring" style={{ color: 'var(--dim)' }}>
                  {t('next')} →
                </Link>
              ) : (
                <span style={{ color: 'var(--faint)' }}>{t('next')} →</span>
              )}
            </nav>
          )}

          <div
            style={{
              textAlign: "center",
              padding: "32px 0 48px",
              color: "var(--dim)",
              fontSize: 14,
            }}
          >
            {loading ? (
              t('loadingMore')
            ) : errored ? (
              <button
                onClick={() => {
                  setErrored(false);
                  void loadMore();
                }}
                className="focus-ring"
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                {t('retryFailed')}
              </button>
            ) : done ? (
              t('reachedEnd')
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Trigger + hover-open panel for switching between a category and its
 * subcategories — same interaction and visual language as the Nav's category
 * submenu and the search bar's autosuggest dropdown (dark floating panel,
 * row-highlight on hover), rather than a native <select>'s browser chrome.
 */
function CategorySelect({
  label,
  ariaLabel,
  activeValue,
  options,
}: {
  label: string;
  ariaLabel: string;
  activeValue: string;
  options: { value: string; label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  // Small delay so moving the mouse from the trigger into the panel doesn't
  // flicker it closed — same pattern as FilterDropdown in TicketFilters.tsx.
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }
  // Closing immediately on click (rather than waiting for closeSoon) means
  // the panel doesn't stay stuck open over whatever page the link navigates to.
  function closeNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div ref={rootRef} onMouseEnter={openNow} onMouseLeave={closeSoon} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openNow())}
        aria-expanded={open}
        aria-label={ariaLabel}
        className="focus-ring"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '10px 14px',
          borderRadius: 12,
          border: `1px solid ${open ? 'var(--border-2)' : 'var(--border)'}`,
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 14.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {label}
        <Icon name="chevronDown" size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', opacity: 0.7 }} />
      </button>

      {open && (
        <div
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            insetInlineStart: 0,
            minWidth: 220,
            maxHeight: 320,
            overflowY: 'auto',
            padding: 8,
            background: '#12121b',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-2)',
            borderRadius: 16,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,.7)',
            // Above SearchBar's form (200) and its dropdowns (210) — same
            // reasoning as the Nav header's z-index — so this panel doesn't
            // render underneath the search bar just below it on the page.
            zIndex: 220,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {options.map((opt) => {
              const active = opt.value === activeValue;
              return (
                <Link
                  key={opt.value}
                  href={opt.href}
                  prefetch={false}
                  onClick={closeNow}
                  className="focus-ring"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 9,
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 400,
                    color: active ? 'var(--text)' : 'var(--dim)',
                    background: active ? 'var(--surface-2)' : 'transparent',
                    whiteSpace: 'nowrap',
                    transition: 'background .12s, color .12s',
                  }}
                  // Same hover-highlight pattern as the Nav submenu and the
                  // search bar's autosuggest rows.
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-2)';
                    e.currentTarget.style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = active ? 'var(--surface-2)' : 'transparent';
                    e.currentTarget.style.color = active ? 'var(--text)' : 'var(--dim)';
                  }}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
