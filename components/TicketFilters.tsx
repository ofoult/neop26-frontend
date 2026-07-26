'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ApiListingCategory } from '@/lib/types';
import { Icon } from './Icon';
import { validSeatCounts } from './TicketPicker';

export interface TicketFilterState {
  quantities: Set<number>;
  categoryNames: Set<string>;
  ticketTypes: Set<string>;
}

export function emptyTicketFilterState(): TicketFilterState {
  return { quantities: new Set(), categoryNames: new Set(), ticketTypes: new Set() };
}

export function hasActiveTicketFilters(filters: TicketFilterState): boolean {
  return filters.quantities.size > 0 || filters.categoryNames.size > 0 || filters.ticketTypes.size > 0;
}

/**
 * IDs of categories matching every active filter group (AND across groups,
 * OR within a group) — e.g. quantity=2 AND (type=Standard OR type=VIP).
 */
export function filterCategoryIds(categories: ApiListingCategory[], filters: TicketFilterState): Set<string> {
  return new Set(
    categories
      .filter((cat) => {
        if (filters.categoryNames.size > 0 && !filters.categoryNames.has(cat.name)) return false;
        if (filters.ticketTypes.size > 0 && !cat.ticketTypes.some((t) => filters.ticketTypes.has(t))) return false;
        if (filters.quantities.size > 0) {
          const counts = validSeatCounts(cat.splitType, cat.maxQuantity);
          if (!counts.some((n) => filters.quantities.has(n))) return false;
        }
        return true;
      })
      .map((cat) => cat.id),
  );
}

function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label
      className="focus-ring"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 9,
        fontSize: 13.5,
        color: checked ? 'var(--text)' : 'var(--dim)',
        fontWeight: checked ? 600 : 400,
        cursor: 'pointer',
        background: checked ? 'var(--surface-2)' : 'transparent',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => {
        if (!checked) e.currentTarget.style.background = 'var(--surface)';
      }}
      onMouseLeave={(e) => {
        if (!checked) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: 5,
          border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border-2)'}`,
          background: checked ? 'var(--grad)' : 'transparent',
          display: 'grid',
          placeItems: 'center',
          transition: 'all .15s',
        }}
      >
        {checked && <Icon name="check" size={11} stroke={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      {label}
    </label>
  );
}

/** A "select box" that, on hover (or click/focus for touch + keyboard), opens a floating checkbox list. */
function FilterDropdown({
  label,
  count,
  wide,
  children,
}: {
  label: string;
  count: number;
  /** Wider panel + multi-column grid, used for the quantity list. */
  wide?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  // Small delay so moving the mouse from the trigger into the panel doesn't
  // flicker it closed.
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
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

  const active = count > 0;

  return (
    <div ref={rootRef} onMouseEnter={openNow} onMouseLeave={closeSoon} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openNow())}
        aria-expanded={open}
        className="focus-ring"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '11px 16px',
          borderRadius: 12,
          border: `1px solid ${active ? 'var(--accent)' : open ? 'var(--border-2)' : 'var(--border)'}`,
          background: active ? 'rgba(139,92,246,.12)' : 'var(--surface)',
          color: 'var(--text)',
          fontSize: 13.5,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color .15s, background .15s',
        }}
      >
        {label}
        {active && (
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: 'var(--grad)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {count}
          </span>
        )}
        <Icon name="chevronDown" size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', opacity: 0.7 }} />
      </button>

      {open && (
        <div
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            width: wide ? 260 : 220,
            padding: 10,
            background: '#12121b',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-2)',
            borderRadius: 16,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,.7)',
            zIndex: 60,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          <div style={wide ? { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 } : { display: 'flex', flexDirection: 'column', gap: 2 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Three hover-opens-a-checklist "select box" filters (quantity / category /
 * ticket type) rendered above the seating plan. Meant to live inside the
 * sticky seatmap column so it moves with the map and stays visible while the
 * ticket list scrolls.
 */
export function TicketFilters({
  categories,
  filters,
  onChange,
}: {
  categories: ApiListingCategory[];
  filters: TicketFilterState;
  onChange: (next: TicketFilterState) => void;
}) {
  const maxQuantity = categories.reduce((m, c) => Math.max(m, c.maxQuantity), 0);
  const quantityOptions = Array.from({ length: Math.min(20, maxQuantity) }, (_, i) => i + 1);
  const categoryOptions = Array.from(new Set(categories.map((c) => c.name)));
  const typeOptions = Array.from(new Set(categories.flatMap((c) => c.ticketTypes)));

  const showQuantity = quantityOptions.length > 1;
  const showCategory = categoryOptions.length > 1;
  const showType = typeOptions.length > 1;
  if (!showQuantity && !showCategory && !showType) return null;

  function toggleQuantity(n: number) {
    const next = new Set(filters.quantities);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onChange({ ...filters, quantities: next });
  }
  function toggleCategory(name: string) {
    const next = new Set(filters.categoryNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange({ ...filters, categoryNames: next });
  }
  function toggleType(t: string) {
    const next = new Set(filters.ticketTypes);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange({ ...filters, ticketTypes: next });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
      {showQuantity && (
        <FilterDropdown label="Quantity" count={filters.quantities.size} wide>
          {quantityOptions.map((n) => (
            <label
              key={n}
              className="focus-ring"
              style={{
                display: 'grid',
                placeItems: 'center',
                aspectRatio: '1',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: filters.quantities.has(n) ? 700 : 500,
                color: filters.quantities.has(n) ? '#fff' : 'var(--dim)',
                background: filters.quantities.has(n) ? 'var(--grad)' : 'var(--surface)',
                border: `1px solid ${filters.quantities.has(n) ? 'transparent' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              <input
                type="checkbox"
                checked={filters.quantities.has(n)}
                onChange={() => toggleQuantity(n)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              {n}
            </label>
          ))}
        </FilterDropdown>
      )}

      {showCategory && (
        <FilterDropdown label="Category" count={filters.categoryNames.size}>
          {categoryOptions.map((name) => (
            <CheckboxRow key={name} checked={filters.categoryNames.has(name)} onChange={() => toggleCategory(name)} label={name} />
          ))}
        </FilterDropdown>
      )}

      {showType && (
        <FilterDropdown label="Ticket type" count={filters.ticketTypes.size}>
          {typeOptions.map((t) => (
            <CheckboxRow key={t} checked={filters.ticketTypes.has(t)} onChange={() => toggleType(t)} label={t} />
          ))}
        </FilterDropdown>
      )}

      {hasActiveTicketFilters(filters) && (
        <button
          onClick={() => onChange(emptyTicketFilterState())}
          className="focus-ring"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-2)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '11px 4px',
          }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
