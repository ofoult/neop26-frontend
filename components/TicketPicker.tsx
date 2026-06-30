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

  // No listings: say so plainly. No synthetic tiers, no fabricated prices.
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

/** Describes how many tickets are left, with emphasis when stock is low. */
function availabilityLabel(available: number): { text: string; hot: boolean } {
  if (available <= 0) return { text: 'Limited', hot: false };
  if (available <= 10) return { text: `Only ${available} left`, hot: true };
  return { text: `${available} available`, hot: false };
}

/** Real ticket categories backed by live Gigsberg listings. */
function RealTickets({ ev, categories }: { ev: NeopEvent; categories: ApiListingCategory[] }) {
  // One category at a time; seats can't be split across categories.
  const [selectedId, setSelectedId] = useState(categories[0].id);
  const [qty, setQty] = useState(1);
  const sel = categories.find((c) => c.id === selectedId) ?? categories[0];
  const symbol = currencySymbol(sel.currency, ev.currency);
  // Cap seats at the checkout listing's available quantity.
  const maxQty = Math.max(1, sel.maxQuantity || 1);
  const q = Math.min(Math.max(1, qty), maxQty);
  const subtotal = Math.round(sel.fromPrice * q * 100) / 100;
  const href = sel.checkoutUrl ? checkoutHref(sel.checkoutUrl, q) : ev.url ?? '/browse';

  return (
    <Panel>
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((cat) => {
          const on = cat.id === selectedId;
          const sym = currencySymbol(cat.currency, ev.currency);
          const avail = availabilityLabel(cat.available);
          const hasRange = cat.maxPrice > cat.fromPrice;
          const desc = cat.ticketTypes.length > 0 ? cat.ticketTypes.join(' · ') : `${cat.listings} listing${cat.listings === 1 ? '' : 's'}`;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedId(cat.id)}
              className="focus-ring"
              style={{
                textAlign: 'left',
                padding: '16px 18px',
                borderRadius: 16,
                border: on ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: on ? 'var(--surface-2)' : 'transparent',
                transition: 'all .2s',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{cat.name}</span>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  {hasRange && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginRight: 4 }}>from</span>}
                  {sym}
                  {cat.fromPrice}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--dim)' }}>{desc}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: avail.hot ? 'var(--accent-2)' : 'var(--faint)' }}>{avail.text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* seats for the selected category (one category per order) */}
      <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Seats</div>
          <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 2 }}>Up to {maxQty} for {sel.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => setQty(Math.max(1, q - 1))}
            disabled={q <= 1}
            className="focus-ring"
            style={{ ...qtyBtn, opacity: q <= 1 ? 0.4 : 1 }}
            aria-label="Remove seat"
          >
            <Icon name="minus" size={16} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{q}</span>
          <button
            onClick={() => setQty(Math.min(maxQty, q + 1))}
            disabled={q >= maxQty}
            className="focus-ring"
            style={{ ...qtyBtn, opacity: q >= maxQty ? 0.4 : 1 }}
            aria-label="Add seat"
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 22px 22px' }}>
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
            Subtotal · {q} × {symbol}
            {sel.fromPrice}
          </span>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {symbol}
            {subtotal}
          </span>
        </div>
        <Btn full size="lg" iconR="arrow" href={href}>
          Get {q} {q === 1 ? 'ticket' : 'tickets'}
        </Btn>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 13, color: 'var(--faint)' }}>
          <Icon name="lock" size={14} /> Protected by neop&apos;s 100% guarantee
        </div>
      </div>
    </Panel>
  );
}
