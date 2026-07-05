'use client';

import { useState } from 'react';
import type { ApiEventSeatingPlan, ApiListingCategory, NeopEvent } from '@/lib/types';
import { SeatingPlanSvg } from './SeatingPlanSvg';
import { TicketPicker, useSeatSelection } from './TicketPicker';

export function TicketsAndSeatingPlan({
  ev,
  categories,
  seatingPlan,
  svgMarkup,
}: {
  ev: NeopEvent;
  categories?: ApiListingCategory[];
  seatingPlan: ApiEventSeatingPlan | null;
  svgMarkup: string | null;
}) {
  // Row -> seatmap: hovering a price row highlights every seat in that category.
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  // Seat -> row: hovering one seat effects only its matching price row, kept
  // separate so it doesn't also trigger the category-wide seat highlight above.
  const [hoveredSeatCategory, setHoveredSeatCategory] = useState<string | null>(null);
  const hasSeatingPlan = !!(seatingPlan && svgMarkup);

  // Owned here (not inside TicketPicker) so a seat click on the plan — a
  // sibling component — can drive the same "add a seat" state.
  const seatSelection = useSeatSelection();

  function handleSeatClick(categoryName: string) {
    if (seatSelection.activeId !== null) return; // only the first click starts a selection
    const cat = categories?.find((c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase());
    if (cat) seatSelection.inc(cat);
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: hasSeatingPlan ? '400px 1fr' : '400px',
        gap: 48,
        alignItems: 'start',
      }}
    >
      <TicketPicker
        ev={ev}
        categories={categories}
        onHoverCategory={setHoveredCategory}
        highlightedCategory={hoveredSeatCategory}
        seatSelection={seatSelection}
      />

      {hasSeatingPlan && (
        <div>
          <h3 className="serif" style={{ fontSize: 26, margin: '0 0 18px' }}>
            Seating plan
          </h3>
          <div
            style={{
              borderRadius: 18,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              padding: 20,
            }}
          >
            <SeatingPlanSvg
              svgMarkup={svgMarkup as string}
              categories={(seatingPlan as ApiEventSeatingPlan).categories}
              pricingCategories={categories ?? []}
              fallbackCurrency={ev.currency}
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
