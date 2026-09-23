'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchListingsInCurrency } from '@/app/actions';
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

  function handleSeatClick(categoryName: string) {
    const cat = categories?.find((c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase());
    if (!cat) return;
    // Selects this category (starting at the quantity filter's seat count)
    // unless it's already the active one, so its row's select reflects the click.
    seatSelection.start(cat, defaultQuantity);
  }

  return (
    <div className={`tickets-plan-grid ${hasSeatingPlan ? 'has-plan' : 'no-plan'}`}>
      <div
        className="tickets-plan-tickets"
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
        />
      </div>

      {hasSeatingPlan && (
        <div className="tickets-plan-seatmap">
          {categories && categories.length > 0 && (
            <TicketFilters categories={categories} filters={filters} onChange={setFilters} />
          )}
          <div
            className="tickets-plan-seatmap-box"
            style={{
              borderRadius: 18,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              padding: 12,
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
