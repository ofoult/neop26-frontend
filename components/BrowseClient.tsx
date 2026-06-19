'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EventCard } from '@/components/EventCard';
import { SearchBar } from '@/components/SearchBar';
import { CatPill } from '@/components/ui';
import { CATEGORIES, categoryById } from '@/lib/categories';
import { parseDate } from '@/lib/format';
import type { CategoryId, NeopEvent } from '@/lib/types';

type SortKey = 'trending' | 'price' | 'date';
const SORTS: [SortKey, string][] = [
  ['trending', 'Trending'],
  ['price', 'Price'],
  ['date', 'Date'],
];

export function BrowseClient({
  events,
  total,
  activeCat,
}: {
  events: NeopEvent[];
  total: number;
  activeCat: CategoryId | null;
}) {
  const [sort, setSort] = useState<SortKey>('trending');
  const catObj = activeCat ? categoryById(activeCat) : undefined;

  const sorted = useMemo(() => {
    const list = [...events];
    if (sort === 'price') {
      list.sort((a, b) => (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity));
    } else if (sort === 'date') {
      list.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
    } else {
      list.sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0));
    }
    return list;
  }, [events, sort]);

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '32px 28px 0' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13.5, color: 'var(--faint)', marginBottom: 10 }}>
          <Link href="/" style={{ color: 'var(--dim)' }}>
            Home
          </Link>{' '}
          / Browse{catObj ? ` / ${catObj.label}` : ''}
        </div>
        <h1 className="serif" style={{ fontSize: 'clamp(36px,5vw,58px)', margin: 0, lineHeight: 1 }}>
          {catObj ? (
            catObj.label
          ) : (
            <>
              Discover events{' '}
              <span className="ital" style={{ color: 'var(--dim)' }}>
                worldwide
              </span>
            </>
          )}
        </h1>
      </div>

      <div style={{ marginBottom: 22 }}>
        <SearchBar compact />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <CatPill cat={{ label: 'All', emoji: '✺' }} active={!activeCat} href="/browse" />
        {CATEGORIES.map((c) => (
          <CatPill key={c.id} cat={c} active={activeCat === c.id} href={`/browse?cat=${c.id}`} />
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13.5, color: 'var(--faint)' }}>Sort</span>
          <div
            style={{
              display: 'flex',
              gap: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
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
                  padding: '7px 14px',
                  borderRadius: 999,
                  fontSize: 13.5,
                  fontWeight: 600,
                  background: sort === k ? 'var(--text)' : 'transparent',
                  color: sort === k ? '#0a0a0f' : 'var(--dim)',
                  transition: 'all .2s',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 14, color: 'var(--dim)', marginBottom: 18 }}>
        {total.toLocaleString()} events
        {sorted.length < total ? ` · showing ${sorted.length}` : ''}
      </div>
      {sorted.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 16, padding: '40px 0' }}>
          No events found in this category.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {sorted.map((e, i) => (
            <EventCard key={e.id} ev={e} i={i} />
          ))}
        </div>
      )}
    </div>
  );
}
