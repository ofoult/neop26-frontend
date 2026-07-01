'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { currencySymbol } from '@/lib/format';
import type { ApiListingCategory, NeopEvent } from '@/lib/types';
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
function Panel({ children }: { children: ReactNode }) {
  return (
    <aside style={{ position: 'sticky', top: 104 }}>
      <div style={{ borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '22px 22px 6px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--faint)' }}>
            Select tickets
          </div>
        </div>
        {children}
      </div>
    </aside>
  );
}

export function TicketPicker({ ev, categories }: { ev: NeopEvent; categories?: ApiListingCategory[] }) {
  // Real per-category pricing from the Gigsberg listing search.
  if (categories && categories.length > 0) {
    return <RealTickets ev={ev} categories={categories} />;
  }

  // No per-category listings: check out via the event's general Gigsberg URL.
  // If even that is missing, there's nothing to buy, so say so.
  if (!ev.url) {
    return (
      <Panel>
        <div style={{ padding: '14px 22px 28px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Icon name="ticket" size={18} />
          <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.6, margin: 0 }}>
            Tickets for this event are not available right now. Please check back later.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div style={{ padding: '12px 22px 0' }}>
        <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.6, margin: 0 }}>
          Seat-by-seat pricing isn&apos;t available for this event — continue on our partner&apos;s page to
          see options and check out.
        </p>
      </div>
      <div style={{ padding: '20px 22px 22px' }}>
        <Btn full size="lg" iconR="arrow" href={ev.url}>
          Get tickets
        </Btn>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 13, color: 'var(--faint)' }}>
          <Icon name="lock" size={14} /> Protected by neop&apos;s 100% guarantee
        </div>
      </div>
    </Panel>
  );
}

/** Describes how many tickets are left, with emphasis when stock is low. */
function availabilityLabel(available: number): { text: string; hot: boolean } {
  if (available <= 0) return { text: 'Limited', hot: false };
  if (available <= 10) return { text: `Only ${available} left`, hot: true };
  return { text: `${available} available`, hot: false };
}

/**
 * The seat counts a listing actually allows, given its split rule and available
 * quantity Q. The stepper walks this list, so only valid counts are reachable.
 *   any            → 1 … Q
 *   none           → exactly Q (must take the whole listing)
 *   pairs          → even counts 2, 4 … ≤ Q
 *   dont_leave_one → 1 … Q, except Q−1 (can't leave a single seat behind)
 */
function validSeatCounts(splitType: string | null, max: number): number[] {
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
function splitHint(splitType: string | null): string {
  switch (splitType) {
    case 'none':
      return 'Full set only';
    case 'pairs':
      return 'Sold in pairs';
    case 'dont_leave_one':
      return "Can't leave a single seat";
    default:
      return '';
  }
}

/** Real ticket categories backed by live Gigsberg listings. */
function RealTickets({ ev, categories }: { ev: NeopEvent; categories: ApiListingCategory[] }) {
  // Only one category can hold seats at a time. `activeId` is that category (or
  // null when nothing is selected yet); `qty` is its chosen seat count.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qty, setQty] = useState(0);

  const active = activeId ? categories.find((c) => c.id === activeId) ?? null : null;
  const activeSymbol = currencySymbol(active?.currency ?? null, ev.currency);
  const subtotal = active ? Math.round(active.fromPrice * qty * 100) / 100 : 0;
  const href = active?.checkoutUrl ? checkoutHref(active.checkoutUrl, qty) : ev.url ?? '/browse';

  // Step up to the next valid seat count (starting a category if none active).
  function inc(cat: ApiListingCategory) {
    const counts = validSeatCounts(cat.splitType, cat.maxQuantity);
    if (counts.length === 0) return;
    if (activeId !== cat.id) {
      setActiveId(cat.id);
      setQty(counts[0]);
      return;
    }
    const i = counts.indexOf(qty);
    if (i >= 0 && i < counts.length - 1) setQty(counts[i + 1]);
  }
  // Step down; going below the smallest valid count deselects the category.
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

  return (
    <Panel>
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((cat) => {
          const isActive = activeId === cat.id;
          // Once a category is active, only its stepper is shown.
          const showStepper = activeId === null || isActive;
          const counts = validSeatCounts(cat.splitType, cat.maxQuantity);
          // Most seats buyable in one order (the largest valid count for the rule).
          const maxSel = counts.length ? counts[counts.length - 1] : 0;
          const rowQty = isActive ? qty : 0;
          const canInc = counts.length > 0 && (!isActive || counts.indexOf(qty) < counts.length - 1);
          const canDec = isActive; // removing steps down or deselects
          const sym = currencySymbol(cat.currency, ev.currency);
          const avail = availabilityLabel(cat.available);
          const hasRange = cat.maxPrice > cat.fromPrice;
          const hint = splitHint(cat.splitType);
          const desc = cat.ticketTypes.length > 0 ? cat.ticketTypes.join(' · ') : `${cat.listings} listing${cat.listings === 1 ? '' : 's'}`;
          return (
            <div
              key={cat.id}
              style={{
                padding: '16px 18px',
                borderRadius: 16,
                border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: isActive ? 'var(--surface-2)' : 'transparent',
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
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: avail.hot ? 'var(--accent-2)' : 'var(--faint)' }}>
                    {cat.available} available
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>
                    max {maxSel} / order
                  </span>
                </span>
              </div>
              {showStepper && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginTop: 12 }}>
                  <button
                    onClick={() => dec(cat)}
                    disabled={!canDec}
                    className="focus-ring"
                    style={{ ...qtyBtn, opacity: canDec ? 1 : 0.4 }}
                    aria-label={`Remove seat from ${cat.name}`}
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <span style={{ fontSize: 18, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{rowQty}</span>
                  <button
                    onClick={() => inc(cat)}
                    disabled={!canInc}
                    className="focus-ring"
                    style={{ ...qtyBtn, opacity: canInc ? 1 : 0.4 }}
                    aria-label={`Add seat to ${cat.name}`}
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '20px 22px 22px' }}>
        {active ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '16px 0',
                borderTop: '1px solid var(--border)',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 14.5, color: 'var(--dim)' }}>
                {active.name} · {qty} × {activeSymbol}
                {active.fromPrice}
              </span>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {activeSymbol}
                {subtotal}
              </span>
            </div>
            <Btn full size="lg" iconR="arrow" href={href}>
              Get {qty} {qty === 1 ? 'ticket' : 'tickets'}
            </Btn>
          </>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--faint)', textAlign: 'center', padding: '12px 0 2px', margin: 0 }}>
            Add seats to a category to continue.
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 13, color: 'var(--faint)' }}>
          <Icon name="lock" size={14} /> Protected by neop&apos;s 100% guarantee
        </div>
      </div>
    </Panel>
  );
}
