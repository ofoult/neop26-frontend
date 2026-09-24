'use client';

import { useTranslations } from 'next-intl';
import type { ApiListingCategory } from '@/lib/types';
import { Icon } from './Icon';
import { FilterDropdown, QuantityOptions } from './FilterDropdown';
import { validSeatCounts } from './TicketPicker';

export interface TicketFilterState {
  /** At most one seat count can be selected at a time (radio-like), or null for "any". */
  quantity: number | null;
  categoryNames: Set<string>;
  ticketTypes: Set<string>;
}

export function emptyTicketFilterState(): TicketFilterState {
  return { quantity: null, categoryNames: new Set(), ticketTypes: new Set() };
}

export function hasActiveTicketFilters(filters: TicketFilterState): boolean {
  return filters.quantity !== null || filters.categoryNames.size > 0 || filters.ticketTypes.size > 0;
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
        if (filters.quantity !== null) {
          const counts = validSeatCounts(cat.splitType, cat.maxQuantity);
          if (!counts.includes(filters.quantity)) return false;
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
  const t = useTranslations('TicketFilters');
  const maxQuantity = categories.reduce((m, c) => Math.max(m, c.maxQuantity), 0);
  const quantityOptions = Array.from({ length: Math.min(20, maxQuantity) }, (_, i) => i + 1);
  const categoryOptions = Array.from(new Set(categories.map((c) => c.name)));
  const typeOptions = Array.from(new Set(categories.flatMap((c) => c.ticketTypes)));

  const showQuantity = quantityOptions.length > 1;
  const showCategory = categoryOptions.length > 1;
  const showType = typeOptions.length > 1;
  if (!showQuantity && !showCategory && !showType) return null;

  // Radio-like: picking a number selects it exclusively; picking the
  // already-selected number clears it back to "any".
  function selectQuantity(n: number) {
    onChange({ ...filters, quantity: filters.quantity === n ? null : n });
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
    // flexWrap nowrap: the filters must always stay on a single line
    <div className="ticket-filters-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 10, marginBottom: 12 }}>
      {showQuantity && (
        <FilterDropdown
          label={filters.quantity !== null ? t('ticketsCount', { count: filters.quantity }) : t('quantity')}
          active={filters.quantity !== null}
          wide
        >
          <QuantityOptions options={quantityOptions} selected={filters.quantity} onSelect={selectQuantity} name="ticket-quantity" />
        </FilterDropdown>
      )}

      {showCategory && (
        <FilterDropdown label={t('category')} active={filters.categoryNames.size > 0} badge={filters.categoryNames.size}>
          {categoryOptions.map((name) => (
            <CheckboxRow key={name} checked={filters.categoryNames.has(name)} onChange={() => toggleCategory(name)} label={name} />
          ))}
        </FilterDropdown>
      )}

      {showType && (
        <FilterDropdown label={t('ticketType')} active={filters.ticketTypes.size > 0} badge={filters.ticketTypes.size}>
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
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {t('clearAll')}
        </button>
      )}
    </div>
  );
}
