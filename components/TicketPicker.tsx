'use client';

import { useTranslations } from 'next-intl';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { currencySymbol } from '@/lib/format';
import type { ApiListingCategory, NeopEvent } from '@/lib/types';
import { Drawer } from './Drawer';
import { Icon } from './Icon';
import { Btn } from './ui';

const qtyBtn: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '1px solid var(--border-2)',
  background: 'var(--surface)',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--text)',
};

/**
 * Builds the checkout link, putting the chosen seat count into the listing's
 * `quantity` param. The API hands us URLs ending in `...&quantity=`; setting the
 * param is robust whether or not it already has a value.
 */
function checkoutHref(url: string, qty: number): string {
  try {
    const u = new URL(url);
    u.searchParams.set('quantity', String(qty));
    return u.toString();
  } catch {
    return url.endsWith('quantity=') ? `${url}${qty}` : `${url}${url.includes('?') ? '&' : '?'}quantity=${qty}`;
  }
}

/** Shared sticky card chrome + "Select tickets" header. */
export function Panel({ children }: { children: ReactNode }) {
  const t = useTranslations('TicketPicker');
  return (
    <aside style={{ position: 'sticky', top: 104 }}>
      <div style={{ borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '22px 22px 6px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--faint)' }}>
            {t('selectTickets')}
          </div>
        </div>
        {children}
      </div>
    </aside>
  );
}

export function TicketPicker({
  ev,
  categories,
  onHoverCategory,
  highlightedCategory,
  seatSelection,
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  visibleCategoryIds,
  defaultQuantity,
}: {
  ev: NeopEvent;
  categories?: ApiListingCategory[];
  /** Fired with the hovered category's name (or null on leave) — drives the seating-plan highlight. */
  onHoverCategory?: (name: string | null) => void;
  /** Name of the category whose seat is currently hovered on the seating plan — effects the matching row. */
  highlightedCategory?: string | null;
  /** Owned by the parent so a seat click on the seating plan can drive it too. */
  seatSelection: SeatSelection;
  /** Whether the "select tickets" drawer for `seatSelection.activeId` is open. */
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  /** When set, only categories whose id is in this set are shown in the list (the rest of `categories` — active selection, checkout — is unaffected). `null`/`undefined` means show all. */
  visibleCategoryIds?: Set<string> | null;
  /** Seat count a fresh "Buy" click should start at — the quantity filter's value, or 1. */
  defaultQuantity: number;
}) {
  const t = useTranslations('TicketPicker');
  // Real per-category pricing from the Gigsberg listing search.
  if (categories && categories.length > 0) {
    return (
      <RealTickets
        ev={ev}
        categories={categories}
        onHoverCategory={onHoverCategory}
        highlightedCategory={highlightedCategory}
        seatSelection={seatSelection}
        drawerOpen={drawerOpen}
        onOpenDrawer={onOpenDrawer}
        onCloseDrawer={onCloseDrawer}
        visibleCategoryIds={visibleCategoryIds}
        defaultQuantity={defaultQuantity}
      />
    );
  }

  // No per-category listings: check out via the event's general Gigsberg URL.
  // If even that is missing, there's nothing to buy, so say so.
  if (!ev.url) {
    return (
      <Panel>
        <div style={{ padding: '14px 22px 28px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Icon name="ticket" size={18} />
          <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.6, margin: 0 }}>
            {t('notAvailable')}
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div style={{ padding: '12px 22px 0' }}>
        <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.6, margin: 0 }}>
          {t('noSeatPricing')}
        </p>
      </div>
      <div style={{ padding: '20px 22px 22px' }}>
        <Btn full size="lg" iconR="arrow" href={ev.url} newTab>
          {t('getTickets')}
        </Btn>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 13, color: 'var(--faint)' }}>
          <Icon name="lock" size={14} /> {t('protectedGuarantee')}
        </div>
      </div>
    </Panel>
  );
}

/** Describes how many tickets are left, with emphasis when stock is low. */
function availabilityLabel(available: number, t: ReturnType<typeof useTranslations>): { text: string; hot: boolean } {
  if (available <= 0) return { text: t('limited'), hot: false };
  if (available <= 10) return { text: t('onlyLeft', { count: available }), hot: true };
  return { text: t('available', { count: available }), hot: false };
}

/**
 * The seat counts a listing actually allows, given its split rule and available
 * quantity Q. The stepper walks this list, so only valid counts are reachable.
 *   any            → 1 … Q
 *   none           → exactly Q (must take the whole listing)
 *   pairs          → even counts 2, 4 … ≤ Q
 *   dont_leave_one → 1 … Q, except Q−1 (can't leave a single seat behind)
 */
export function validSeatCounts(splitType: string | null, max: number): number[] {
  const q = Math.max(0, Math.floor(max || 0));
  if (q < 1) return [];
  switch (splitType) {
    case 'none':
      return [q];
    case 'pairs': {
      const out: number[] = [];
      for (let n = 2; n <= q; n += 2) out.push(n);
      return out;
    }
    case 'dont_leave_one':
      return Array.from({ length: q }, (_, i) => i + 1).filter((n) => q - n !== 1);
    case 'any':
    default:
      return Array.from({ length: q }, (_, i) => i + 1);
  }
}

/** Short human hint for a non-trivial split rule (empty for "any"/unknown). */
function splitHint(splitType: string | null, t: ReturnType<typeof useTranslations>): string {
  switch (splitType) {
    case 'none':
      return t('fullSetOnly');
    case 'pairs':
      return t('soldInPairs');
    case 'dont_leave_one':
      return t('cantLeaveOne');
    default:
      return '';
  }
}

export interface SeatSelection {
  /** The one category currently holding seats, or null when none is selected. */
  activeId: string | null;
  qty: number;
  /**
   * Steps up to the next valid seat count, starting the category if none is
   * active yet. `startQty` (the quantity filter's value, or 1) seeds the
   * initial count when starting fresh — falling back to the smallest valid
   * count if the category doesn't support it.
   */
  inc: (cat: ApiListingCategory, startQty?: number) => void;
  /** Steps down; going below the smallest valid count deselects the category. */
  dec: (cat: ApiListingCategory) => void;
}

/**
 * Owns the "one active category, N seats" selection state. Lifted out of
 * RealTickets so a sibling component (the seating-plan SVG) can also drive it
 * — e.g. clicking an available seat adds it the same way the "+" button does.
 */
export function useSeatSelection(): SeatSelection {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qty, setQty] = useState(0);

  function inc(cat: ApiListingCategory, startQty?: number) {
    const counts = validSeatCounts(cat.splitType, cat.maxQuantity);
    if (counts.length === 0) return;
    if (activeId !== cat.id) {
      setActiveId(cat.id);
      setQty(startQty !== undefined && counts.includes(startQty) ? startQty : counts[0]);
      return;
    }
    const i = counts.indexOf(qty);
    if (i >= 0 && i < counts.length - 1) setQty(counts[i + 1]);
  }
  function dec(cat: ApiListingCategory) {
    if (activeId !== cat.id) return;
    const counts = validSeatCounts(cat.splitType, cat.maxQuantity);
    const i = counts.indexOf(qty);
    if (i <= 0) {
      setActiveId(null);
      setQty(0);
    } else {
      setQty(counts[i - 1]);
    }
  }

  return { activeId, qty, inc, dec };
}

/** Real ticket categories backed by live Gigsberg listings. */
function RealTickets({
  ev,
  categories,
  onHoverCategory,
  highlightedCategory,
  seatSelection,
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  visibleCategoryIds,
  defaultQuantity,
}: {
  ev: NeopEvent;
  categories: ApiListingCategory[];
  onHoverCategory?: (name: string | null) => void;
  highlightedCategory?: string | null;
  seatSelection: SeatSelection;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  visibleCategoryIds?: Set<string> | null;
  defaultQuantity: number;
}) {
  const t = useTranslations('TicketPicker');
  const { activeId, qty, inc, dec } = seatSelection;
  // Mirrors `highlightedCategory` (which comes from hovering a seat on the
  // plan) so hovering the row itself picks up the exact same highlight style.
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  // `active`/checkout always resolve against the full `categories` list — only
  // which rows are *displayed* is narrowed by the filters, so a seat clicked
  // on the plan (or an already-open drawer) still works even if its category
  // is currently filtered out of the list below.
  const active = activeId ? categories.find((c) => c.id === activeId) ?? null : null;
  const activeSymbol = currencySymbol(active?.currency ?? null, ev.currency);
  const subtotal = active ? Math.round(active.fromPrice * qty * 100) / 100 : 0;
  const href = active?.checkoutUrl ? checkoutHref(active.checkoutUrl, qty) : ev.url ?? '/browse';
  const rows = visibleCategoryIds ? categories.filter((c) => visibleCategoryIds.has(c.id)) : categories;

  function handleBuy(cat: ApiListingCategory) {
    // Only one category can hold a selection at a time: picking a fresh one
    // starts it at the quantity filter's value (or the smallest valid seat
    // count if unset/unsupported); re-opening the category that's already
    // active resumes wherever it was left.
    if (activeId !== cat.id) inc(cat, defaultQuantity);
    onOpenDrawer();
  }

  return (
    <Panel>
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.length === 0 && (
          <p style={{ fontSize: 14.5, color: 'var(--dim)', lineHeight: 1.6, margin: '4px 6px 8px' }}>
            {t('noMatchFilters')}
          </p>
        )}
        {rows.map((cat) => {
          const isActive = activeId === cat.id;
          const isHighlighted =
            !isActive &&
            ((!!highlightedCategory && cat.name.trim().toLowerCase() === highlightedCategory.trim().toLowerCase()) ||
              hoveredRow === cat.name);
          const counts = validSeatCounts(cat.splitType, cat.maxQuantity);
          // Most seats buyable in one order (the largest valid count for the rule).
          const maxSel = counts.length ? counts[counts.length - 1] : 0;
          const sym = currencySymbol(cat.currency, ev.currency);
          // Never advertise more than a single order could actually take.
          const avail = availabilityLabel(Math.min(cat.available, maxSel), t);
          const hasRange = cat.maxPrice > cat.fromPrice;
          const hint = splitHint(cat.splitType, t);
          const desc = cat.ticketTypes.length > 0 ? cat.ticketTypes.join(' · ') : t('listingsCount', { count: cat.listings });
          return (
            <div
              key={cat.id}
              onMouseEnter={() => {
                setHoveredRow(cat.name);
                onHoverCategory?.(cat.name);
              }}
              onMouseLeave={() => {
                setHoveredRow(null);
                onHoverCategory?.(null);
              }}
              style={{
                padding: '16px 18px',
                borderRadius: 16,
                border: isActive || isHighlighted ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: isActive ? 'var(--surface-2)' : isHighlighted ? 'rgb(2, 45, 95)' : 'transparent',
                transition: 'all .2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{cat.name}</span>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  {sym}
                  {cat.fromPrice}
                  {hasRange && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dim)' }}>
                      {' – '}
                      {sym}
                      {cat.maxPrice}
                    </span>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--dim)' }}>
                  {desc}
                  {hint && <span style={{ color: 'var(--faint)' }}> · {hint}</span>}
                </span>
                <span style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: avail.hot ? 'var(--accent-2)' : 'var(--faint)' }}>
                    {avail.text}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>
                    {t('maxPerOrder', { count: maxSel })}
                  </span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12 }}>
                {isActive && qty > 0 ? (
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent-2)' }}>
                    {t('ticketsSelected', { count: qty })}
                  </span>
                ) : (
                  <span />
                )}
                <Btn size="sm" variant={isActive && qty > 0 ? 'soft' : 'solid'} onClick={() => handleBuy(cat)}>
                  {isActive && qty > 0 ? t('edit') : t('buy')}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '4px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, color: 'var(--faint)' }}>
          <Icon name="lock" size={14} /> {t('protectedGuarantee')}
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={onCloseDrawer} title={t('selectTickets')}>
        {active && (() => {
          const counts = validSeatCounts(active.splitType, active.maxQuantity);
          const atMin = counts.indexOf(qty) <= 0;
          const atMax = counts.indexOf(qty) >= counts.length - 1;
          // Never advertise more than a single order could actually take.
          const activeAvail = availabilityLabel(Math.min(active.available, counts.length ? counts[counts.length - 1] : 0), t);
          return (
            <>
              <div style={{ padding: '22px 22px 0' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{active.name}</div>
                <div style={{ fontSize: 14.5, color: 'var(--dim)', marginTop: 4 }}>
                  {activeSymbol}
                  {active.fromPrice} {t('perTicket')}
                  {activeAvail.hot && <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}> · {activeAvail.text}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '32px 22px' }}>
                <button
                  onClick={() => dec(active)}
                  disabled={atMin}
                  className="focus-ring"
                  style={{ ...qtyBtn, opacity: atMin ? 0.4 : 1 }}
                  aria-label={t('removeSeatFrom', { name: active.name })}
                >
                  <Icon name="minus" size={16} />
                </button>
                <span style={{ fontSize: 32, fontWeight: 800, minWidth: 40, textAlign: 'center' }}>{qty}</span>
                <button
                  onClick={() => inc(active)}
                  disabled={atMax}
                  className="focus-ring"
                  style={{ ...qtyBtn, opacity: atMax ? 0.4 : 1 }}
                  aria-label={t('addSeatTo', { name: active.name })}
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
              {splitHint(active.splitType, t) && (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--faint)', margin: '0 0 8px' }}>{splitHint(active.splitType, t)}</p>
              )}

              <div style={{ marginTop: 'auto', padding: '20px 22px 28px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span style={{ fontSize: 14.5, color: 'var(--dim)' }}>
                    {qty} × {activeSymbol}
                    {active.fromPrice}
                  </span>
                  <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {activeSymbol}
                    {subtotal}
                  </span>
                </div>
                <Btn full size="lg" iconR="arrow" href={href} newTab>
                  {t('getNTickets', { count: qty })}
                </Btn>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 13, color: 'var(--faint)' }}>
                  <Icon name="lock" size={14} /> {t('protectedGuarantee')}
                </div>
              </div>
            </>
          );
        })()}
      </Drawer>
    </Panel>
  );
}
