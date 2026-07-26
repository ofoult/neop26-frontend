'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadMoreEvents } from '@/app/browse/actions';
import { EventCard } from '@/components/EventCard';
import { SearchBar } from '@/components/SearchBar';
import { BROWSE_PER_PAGE } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import { parseDate } from '@/lib/format';
import type { CategoryId, NeopEvent } from '@/lib/types';

type SortKey = 'trending' | 'price' | 'date';
const SORTS: [SortKey, string][] = [
  ['trending', 'Trending'],
  ['price', 'Price'],
  ['date', 'Date'],
];

// Human label for a YYYY-MM-DD date range, e.g. "Jun 20 – Jun 28".
function formatWhenLabel(from?: string, to?: string): string {
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    if (!y || !m || !day) return d;
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `from ${fmt(from)}`;
  if (to) return `until ${fmt(to)}`;
  return '';
}

// Builds a /browse URL for a given page, preserving the active filters —
// used both by the infinite-scroll fetch and the crawlable pagination links.
function pageHref(page: number, activeCat: CategoryId | null, query?: string, where?: string, dateFrom?: string, dateTo?: string): string {
  const params = new URLSearchParams();
  if (activeCat) params.set('cat', activeCat);
  if (query) params.set('q', query);
  if (where) params.set('where', where);
  if (dateFrom) params.set('from', dateFrom);
  if (dateTo) params.set('to', dateTo);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/browse?${qs}` : '/browse';
}

export function BrowseClient({
  events,
  total,
  page: initialPage,
  activeCat,
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
  query?: string;
  where?: string;
  dateFrom?: string;
  dateTo?: string;
  autoFocus?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>('trending');
  const catObj = activeCat ? categoryById(activeCat) : undefined;

  // Infinite scroll state. `items` starts from the server-rendered page (page 1
  // by default, or whichever page a direct/crawled ?page=N hit) and grows as
  // the sentinel scrolls into view.
  const [items, setItems] = useState<NeopEvent[]>(events);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const loadMore = useCallback(async () => {
    if (loadingRef.current || done || errored) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await loadMoreEvents(activeCat, next, query, where, dateFrom, dateTo);
      setItems((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...res.events.filter((e) => !seen.has(e.id))];
      });
      setPage(next);
    } catch {
      // Stop auto-retrying on failure; the "Load more" button allows a retry.
      setErrored(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeCat, page, done, errored, query, where, dateFrom, dateTo]);

  // Observe the sentinel; fetch the next page when it nears the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done]);

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
    where && `in ${where}`,
    formatWhenLabel(dateFrom, dateTo),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      style={{
        maxWidth: "var(--maxw)",
        margin: "0 auto",
        padding: "32px 28px 0",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <div
          style={{ fontSize: 13.5, color: "var(--faint)", marginBottom: 10 }}
        >
          <Link href="/" style={{ color: "var(--dim)" }}>
            Home
          </Link>{" "}
          / Browse{searching ? " / Search" : catObj ? ` / ${catObj.label}` : ""}
        </div>
        <h1
          className="serif"
          style={{ fontSize: "clamp(36px,5vw,58px)", margin: 0, lineHeight: 1 }}
        >
          {searching ? (
            <>
              Results for{" "}
              <span className="ital" style={{ color: "var(--dim)" }}>
                “{searchLabel}”
              </span>
            </>
          ) : catObj ? (
            catObj.label
          ) : (
            <>
              Discover events{" "}
              <span className="ital" style={{ color: "var(--dim)" }}>
                worldwide
              </span>
            </>
          )}
        </h1>
      </div>

      <div style={{ marginBottom: 22 }}>
        <SearchBar
          compact
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{ fontSize: 18, color: "var(--faint)", paddingLeft: 10 }}
          >
            Sort
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
            {SORTS.map(([k, l]) => (
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
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 14, color: "var(--dim)", marginBottom: 18 }}>
        {total.toLocaleString()} artists
        {sorted.length < total ? ` · showing ${sorted.length}` : ""}
      </div>
      {sorted.length === 0 ? (
        <div style={{ color: "var(--dim)", fontSize: 16, padding: "40px 0" }}>
          {searching
            ? `No events match “${searchLabel}”.`
            : "No events found in this category."}
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 18,
            }}
          >
            {sorted.map((e, i) => (
              <EventCard key={e.id} ev={e} i={i} wide />
            ))}
          </div>

          {/* Sentinel: when it scrolls near the viewport, the next page loads. */}
          {!done && <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />}

          {/*
            Real, crawlable ?page=N links. Human visitors never need these —
            the sentinel above already loads more as they scroll — but a
            crawler that doesn't run the IntersectionObserver (or doesn't
            scroll) can still reach every page through these anchors, per
            Google's documented pattern for infinite-scroll pagination:
            https://developers.google.com/search/blog/2014/02/infinite-scroll-search-friendly
          */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, padding: '8px 0 32px', fontSize: 13.5 }}
            >
              {initialPage > 1 ? (
                <Link href={pageHref(initialPage - 1, activeCat, query, where, dateFrom, dateTo)} className="focus-ring" style={{ color: 'var(--dim)' }}>
                  ← Prev
                </Link>
              ) : (
                <span style={{ color: 'var(--faint)' }}>← Prev</span>
              )}
              <span style={{ color: 'var(--faint)' }}>
                Page {initialPage} of {totalPages}
              </span>
              {initialPage < totalPages ? (
                <Link href={pageHref(initialPage + 1, activeCat, query, where, dateFrom, dateTo)} className="focus-ring" style={{ color: 'var(--dim)' }}>
                  Next →
                </Link>
              ) : (
                <span style={{ color: 'var(--faint)' }}>Next →</span>
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
              "Loading more events…"
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
                Couldn’t load more — retry
              </button>
            ) : done ? (
              "You’ve reached the end."
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
