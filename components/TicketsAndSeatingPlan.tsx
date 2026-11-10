'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchListingsInCurrency } from '@/app/actions';
import {
  journeyContext,
  scrollPct,
  trackEventExitWithoutCheckout,
  trackEventView,
  trackGigsbergRedirect,
  trackTicketFilter,
  trackTicketSelect,
  type TicketsState,
} from '@/lib/analytics';
import { useCurrency } from '@/lib/currency';
import type { ApiEventSeatingPlan, ApiListingCategory, NeopEvent } from '@/lib/types';
import { SeatingPlanSvg } from './SeatingPlanSvg';
import { emptyTicketFilterState, filterCategoryIds, hasActiveTicketFilters, TicketFilters, type TicketFilterState } from './TicketFilters';
import { TicketPicker, useSeatSelection } from './TicketPicker';

/**
 * The event's ticket categories in the visitor's chosen display currency.
 * Gigsberg does the conversion (so prices match its checkout); the SSR
 * categories stay in place until that lands — and as the fallback if it fails,
 * in which case <Price> converts them with the indicative rates instead.
 * Re-fetched every hour (the currency provider's `tick`) so prices stay current.
 */
function useCategoriesInCurrency(eventId: string, initial?: ApiListingCategory[]) {
  const { currency, tick } = useCurrency();
  const [localized, setLocalized] = useState<{ currency: string; categories: ApiListingCategory[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currency || !initial || initial.length === 0) {
      setLocalized(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchListingsInCurrency(eventId, currency)
      .then((categories) => {
        if (!cancelled) setLocalized(categories ? { currency, categories } : null);
      })
      .catch(() => {
        if (!cancelled) setLocalized(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `initial` is deliberately not a dependency: it's stable SSR data.
  }, [eventId, currency, tick]);

  const categories = localized && localized.currency === currency ? localized.categories : initial;
  return { categories, loading };
}

/**
 * Funnel tracking for one event page: reports the ticket offer once it's on
 * screen (`view_item`), and — if the visitor leaves (navigation, tab close)
 * without ever heading to Gigsberg — `event_exit_no_checkout` with how long
 * they stayed, how far they scrolled and the furthest step they reached.
 */
function useEventFunnel(ev: NeopEvent, categories: ApiListingCategory[] | undefined, hasSeatingPlan: boolean) {
  const state: TicketsState = categories && categories.length > 0 ? 'listings' : ev.url ? 'general_link' : 'unavailable';
  const minPrice = categories?.length ? Math.min(...categories.map((c) => c.fromPrice)) : ev.priceFrom;
  const currency = categories?.[0]?.currency ?? ev.currencyCode;
  // Read at exit time, so it always describes the latest offer shown (e.g. after a currency switch).
  const live = useRef({ state, minPrice, currency, startedAt: 0, maxScroll: 0, step: 'viewed' as 'viewed' | 'explored' | 'selected', checkedOut: false });
  live.current.state = state;
  live.current.minPrice = minPrice;
  live.current.currency = currency;

  // Survive React re-running the effect on the same page (StrictMode): one
  // `view_item` per event, and an exit report only if the unmount is for real.
  const viewedId = useRef<string | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = live.current;
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = null;
    if (viewedId.current !== ev.id) {
      viewedId.current = ev.id;
      s.startedAt = Date.now();
      s.maxScroll = scrollPct();
      s.step = 'viewed';
      s.checkedOut = false;
      trackEventView(ev, {
        state: s.state,
        minPrice: s.minPrice,
        currency: s.currency,
        categories: categories?.length ?? 0,
        ticketsAvailable: categories?.reduce((n, c) => n + c.available, 0) ?? 0,
        hasSeatingPlan,
      });
    }

    const onScroll = () => {
      s.maxScroll = Math.max(s.maxScroll, scrollPct());
    };
    let reported = false;
    const reportExit = (context = journeyContext()) => {
      if (reported || s.checkedOut) return;
      reported = true;
      trackEventExitWithoutCheckout({
        ev,
        context,
        state: s.state,
        minPrice: s.minPrice,
        currency: s.currency,
        secondsOnPage: Math.round((Date.now() - s.startedAt) / 1000),
        maxScrollPct: s.maxScroll,
        furthestStep: s.step,
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const onPageHide = () => reportExit();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
      // Deferred so an immediate re-mount can cancel it; the context is captured now, while still on this page.
      const context = journeyContext();
      exitTimer.current = setTimeout(() => reportExit(context), 0);
    };
    // Once per event page: the offer is stable SSR data at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev.id]);

  return {
    explored() {
      if (live.current.step === 'viewed') live.current.step = 'explored';
    },
    selected() {
      live.current.step = 'selected';
    },
    checkedOut() {
      live.current.checkedOut = true;
      return Math.round((Date.now() - live.current.startedAt) / 1000);
    },
  };
}

export function TicketsAndSeatingPlan({
  ev,
  categories: ssrCategories,
  seatingPlan,
  svgMarkup,
}: {
  ev: NeopEvent;
  categories?: ApiListingCategory[];
  seatingPlan: ApiEventSeatingPlan | null;
  svgMarkup: string | null;
}) {
  const { categories, loading: pricesLoading } = useCategoriesInCurrency(ev.id, ssrCategories);
  // Row -> seatmap: hovering a price row highlights every seat in that category.
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  // Seat -> row: hovering one seat effects only its matching price row, kept
  // separate so it doesn't also trigger the category-wide seat highlight above.
  const [hoveredSeatCategory, setHoveredSeatCategory] = useState<string | null>(null);
  const hasSeatingPlan = !!(seatingPlan && svgMarkup);
  const funnel = useEventFunnel(ev, ssrCategories, hasSeatingPlan);

  // Owned here (not inside TicketPicker) so a seat click on the plan — a
  // sibling component — can drive the same "add a seat" state.
  const seatSelection = useSeatSelection();
  // Quantity / category / ticket-type filters shown above the seating plan.
  // Owned here (not TicketPicker) since they narrow which rows it displays
  // while the seat click / active-selection logic above still needs the full,
  // unfiltered `categories` list to keep working.
  const [filters, setFilters] = useState<TicketFilterState>(emptyTicketFilterState);
  const visibleCategoryIds = useMemo(
    () => (categories && hasActiveTicketFilters(filters) ? filterCategoryIds(categories, filters) : null),
    [categories, filters],
  );

  // Fresh seat clicks start at the quantity filter's value, or 1 if unset.
  const defaultQuantity = filters.quantity ?? 1;

  // A new quantity filter resets any row the visitor already picked a count on,
  // so every row shows the filtered number again.
  const { clear: clearSeatSelection } = seatSelection;
  useEffect(() => {
    clearSeatSelection();
  }, [filters.quantity]);

  function handleSeatClick(categoryName: string) {
    const cat = categories?.find((c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase());
    if (!cat) return;
    // Selects this category (starting at the quantity filter's seat count)
    // unless it's already the active one, so its row's select reflects the click.
    seatSelection.start(cat, defaultQuantity);
    funnel.selected();
    trackTicketSelect(ev, {
      category: cat.name,
      price: cat.fromPrice,
      quantity: defaultQuantity,
      currency: cat.currency ?? ev.currencyCode,
      source: 'seat_map',
    });
    // Also filters the list down to that category; clicking it again lifts the filter.
    setFilters((f) =>
      f.categoryNames.size === 1 && f.categoryNames.has(cat.name)
        ? { ...f, categoryNames: new Set() }
        : { ...f, categoryNames: new Set([cat.name]) },
    );
  }

  return (
    <div className={`tickets-plan-grid ${hasSeatingPlan ? 'has-plan' : 'no-plan'}`}>
      <div
        className="tickets-plan-tickets"
        data-track-section="ticket_list"
        aria-busy={pricesLoading}
        style={{ opacity: pricesLoading ? 0.6 : 1, transition: 'opacity .2s' }}
      >
        <TicketPicker
          ev={ev}
          categories={categories}
          onHoverCategory={setHoveredCategory}
          highlightedCategory={hoveredSeatCategory}
          seatSelection={seatSelection}
          visibleCategoryIds={visibleCategoryIds}
          defaultQuantity={filters.quantity}
          onSelect={(sel) => {
            funnel.selected();
            trackTicketSelect(ev, { ...sel, source: 'row' });
          }}
          onCheckout={(c) => trackGigsbergRedirect({ ev, ...c, secondsOnPage: funnel.checkedOut() })}
        />
      </div>

      {hasSeatingPlan && (
        <div className="tickets-plan-seatmap" data-track-section="seat_map">
          {categories && categories.length > 0 && (
            <TicketFilters
              categories={categories}
              filters={filters}
              onChange={setFilters}
              onUse={(type, value) => {
                funnel.explored();
                trackTicketFilter(ev, type, value);
              }}
            />
          )}
          <div
            className="tickets-plan-seatmap-box"
            style={{
              borderRadius: 18,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              padding: '28px 12px',
            }}
          >
            <SeatingPlanSvg
              svgMarkup={svgMarkup as string}
              categories={(seatingPlan as ApiEventSeatingPlan).categories}
              pricingCategories={categories ?? []}
              fallbackCurrency={ev.currencyCode}
              hoveredCategoryName={hoveredCategory}
              onHoverSeatCategory={setHoveredSeatCategory}
              onSeatClick={handleSeatClick}
              alt={`${ev.venue} seating plan`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
