'use client';

import { useState } from 'react';
import type { ApiEventSeatingPlan, ApiListingCategory, NeopEvent } from '@/lib/types';
import { SeatingPlanSvg } from './SeatingPlanSvg';
import { TicketPicker } from './TicketPicker';

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
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const hasSeatingPlan = !!(seatingPlan && svgMarkup);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: hasSeatingPlan ? '400px 1fr' : '400px',
        gap: 48,
        alignItems: 'start',
      }}
    >
      <TicketPicker ev={ev} categories={categories} onHoverCategory={setHoveredCategory} />

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
              alt={`${ev.venue} seating plan`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
