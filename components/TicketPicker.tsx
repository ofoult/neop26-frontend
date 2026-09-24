'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { trackGigsbergRedirect } from '@/lib/analytics';
import { Price, useCurrency } from '@/lib/currency';
import type { ApiListingCategory, NeopEvent } from '@/lib/types';
import { FilterDropdown, QuantityOptions } from './FilterDropdown';
import { Icon } from './Icon';
import { Btn } from './ui';

/**
 * Builds the checkout link, putting the chosen seat count into the listing's
 * `quantity` param and localizing the path to match the viewer's site locale
 * (Gigsberg mirrors our locale scheme: English unprefixed, others as `/xx/...`).
 * The API hands us URLs ending in `...&quantity=`; setting the param is robust
 * whether or not it already has a value.
 */
function checkoutHref(url: string, qty: number, locale: string, currency: string | null): string {
  const withQty = (() => {
    try {
      const u = new URL(url);
      u.searchParams.set('quantity', String(qty));
      return u.toString();
    } catch {
      return url.endsWith('quantity=') ? `${url}${qty}` : `${url}${url.includes('?') ? '&' : '?'}quantity=${qty}`;
    }
  })();
  return localizeGigsbergUrl(withQty, locale, currency);
}

// Gigsberg URLs always carry a leading locale segment (e.g. `/en/checkout/...`).
// Inserting a second one instead of replacing it (`/fr/en/checkout/...`) gets
// silently rewritten by Gigsberg's router to a mangled URL with the query
// string — including `aff`/`affiliate_id` — stripped, breaking attribution.
const GIGSBERG_LOCALES = ['en', 'fr', 'es', 'de', 'he'];

/**
 * Swaps (or inserts, if absent) the leading locale segment on a Gigsberg URL,
 * and — when the visitor picked a display currency — passes it as `currency`,
 * which Gigsberg's pages (checkout included) use as their currency.
 */
function localizeGigsbergUrl(url: string, locale: string, currency: string | null = null): string {
  try {
    const u = new URL(url);
    if (currency) u.searchParams.set('currency', currency);
    const segments = u.pathname.split('/');
    if (GIGSBERG_LOCALES.includes(segments[1])) segments[1] = locale;
    else segments.splice(1, 0, locale);
    u.pathname = segments.join('/');
    return u.toString();
  } catch {
    return url;
  }
}

/** Shared sticky card chrome. */
export function Panel({ children }: { children: ReactNode }) {
  return (
    <aside style={{ position: 'sticky', top: 104 }}>
      <div style={{ borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
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
  /** When set, only categories whose id is in this set are shown in the list (the rest of `categories` — active selection, checkout — is unaffected). `null`/`undefined` means show all. */
  visibleCategoryIds?: Set<string> | null;
  /** The quantity filter's value (if active): rows start at this seat count instead of their smallest valid one. */
  defaultQuantity?: number | null;
}) {
  const t = useTranslations('TicketPicker');
  const locale = useLocale();
  const { currency } = useCurrency();
  // Real per-category pricing from the Gigsberg listing search.
  if (categories && categories.length > 0) {
    return (
      <RealTickets
        ev={ev}
        categories={categories}
        onHoverCategory={onHoverCategory}
        highlightedCategory={highlightedCategory}
        seatSelection={seatSelection}
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
        <Btn
          full
          size="lg"
          iconR="arrow"
          href={localizeGigsbergUrl(ev.url, locale, currency)}
          newTab
          onClick={() => trackGigsbergRedirect({ eventName: ev.title, price: ev.priceFrom, currency: ev.currencyCode })}
        >
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
   * Sets the seat count for a category. Only one category can hold seats at a
   * time, so choosing a count on a different category drops the previous
   * selection back to its default; a count the category doesn't allow clears
   * the selection.
   */
  setQty: (cat: ApiListingCategory, qty: number) => void;
  /** Drops any selection, returning every row to its default seat count. */
  clear: () => void;
  /** Starts a category at `startQty` (falling back to its smallest valid count) unless it's already the active one. */
  start: (cat: ApiListingCategory, startQty?: number) => void;
}

/**
 * Owns the "one active category, N seats" selection state. Lifted out of
 * RealTickets so a sibling component (the seating-plan SVG) can also drive it
 * — e.g. clicking an available seat selects its category the same way the
 * row's quantity select does.
 */
export function useSeatSelection(): SeatSelection {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qty, setQtyState] = useState(0);

  function setQty(cat: ApiListingCategory, next: number) {
    if (!validSeatCounts(cat.splitType, cat.maxQuantity).includes(next)) {
      // Only clear if this category is the one being deselected.
      if (activeId === cat.id) {
        setActiveId(null);
        setQtyState(0);
      }
      return;
    }
    setActiveId(cat.id);
    setQtyState(next);
  }
  function start(cat: ApiListingCategory, startQty?: number) {
    if (activeId === cat.id) return;
    const counts = validSeatCounts(cat.splitType, cat.maxQuantity);
    if (counts.length === 0) return;
    setActiveId(cat.id);
    setQtyState(startQty !== undefined && counts.includes(startQty) ? startQty : counts[0]);
  }

  function clear() {
    setActiveId(null);
    setQtyState(0);
  }

  return { activeId, qty, setQty, start, clear };
}

/** Real ticket categories backed by live Gigsberg listings. */
function RealTickets({
  ev,
  categories,
  onHoverCategory,
  highlightedCategory,
  seatSelection,
  visibleCategoryIds,
  defaultQuantity,
}: {
  ev: NeopEvent;
  categories: ApiListingCategory[];
  onHoverCategory?: (name: string | null) => void;
  highlightedCategory?: string | null;
  seatSelection: SeatSelection;
  visibleCategoryIds?: Set<string> | null;
  defaultQuantity?: number | null;
}) {
  const t = useTranslations('TicketPicker');
  const tFilters = useTranslations('TicketFilters');
  const locale = useLocale();
  const { currency } = useCurrency();
  const { activeId, qty, setQty } = seatSelection;
  // Mirrors `highlightedCategory` (which comes from hovering a seat on the
  // plan) so hovering the row itself picks up the exact same highlight style.
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  // Only which rows are *displayed* is narrowed by the filters — the selection
  // state is kept against the full list, so a seat clicked on the plan still
  // works even if its category is currently filtered out of the list below.
  const rows = visibleCategoryIds ? categories.filter((c) => visibleCategoryIds.has(c.id)) : categories;

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
          // Untouched rows show the quantity filter's count (when this category allows it), else their smallest valid count.
          const rowQty = isActive ? qty : defaultQuantity != null && counts.includes(defaultQuantity) ? defaultQuantity : (counts[0] ?? 0);
          // Prices come back in this ISO currency (the chosen one when Gigsberg converted them).
          const priceCurrency = cat.currency ?? ev.currencyCode;
          // Never advertise more than a single order could actually take.
          const avail = availabilityLabel(Math.min(cat.available, maxSel), t);
          const hasRange = cat.maxPrice > cat.fromPrice;
          const hint = splitHint(cat.splitType, t);
          const desc = cat.ticketTypes.length > 0 ? cat.ticketTypes.join(' · ') : t('listingsCount', { count: cat.listings });
          const subtotal = Math.round(cat.fromPrice * rowQty * 100) / 100;
          const href = cat.checkoutUrl
            ? checkoutHref(cat.checkoutUrl, rowQty, locale, currency)
            : localizeGigsbergUrl(ev.url ?? '/browse', locale, currency);
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
                  <Price amount={cat.fromPrice} from={priceCurrency} />
                  {hasRange && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dim)' }}>
                      {' – '}
                      <Price amount={cat.maxPrice} from={priceCurrency} />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  {counts.length > 0 && (
                    <FilterDropdown
                      label={tFilters('ticketsCount', { count: rowQty })}
                      ariaLabel={t('quantityFor', { name: cat.name })}
                      active={isActive}
                      className="seat-count-select"
                      wide
                    >
                      {(close) => (
                        <QuantityOptions
                          options={counts}
                          selected={rowQty}
                          onSelect={(n) => {
                            setQty(cat, n);
                            close();
                          }}
                          name={`seat-count-${cat.id}`}
                        />
                      )}
                    </FilterDropdown>
                  )}
                  {rowQty > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-2)', whiteSpace: 'nowrap' }}>
                      <Price amount={subtotal} from={priceCurrency} />
                    </span>
                  )}
                </div>
                <Btn
                  size="sm"
                  href={rowQty > 0 ? href : undefined}
                  disabled={rowQty === 0}
                  newTab
                  onClick={() =>
                    trackGigsbergRedirect({
                      eventName: ev.title,
                      category: cat.name,
                      price: cat.fromPrice,
                      quantity: rowQty,
                      currency: priceCurrency,
                    })
                  }
                >
                  {t('buy')}
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
    </Panel>
  );
}
