'use client';

import { useState, type CSSProperties } from 'react';
import { tiersFor } from '@/lib/tickets';
import type { NeopEvent } from '@/lib/types';
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

export function TicketPicker({ ev }: { ev: NeopEvent }) {
  // Events without a known price are sold via the partner listing (honest
  // white-label behaviour) rather than the demo checkout flow.
  if (ev.priceFrom == null) {
    return (
      <aside style={{ position: 'sticky', top: 104 }}>
        <div style={{ borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '22px 22px 6px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--faint)' }}>
              Select tickets
            </div>
          </div>
          <div style={{ padding: '12px 22px 0' }}>
            <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.6, margin: 0 }}>
              Live pricing for this event is confirmed on the next step. Reserve your seats through neop&apos;s
              verified partner.
            </p>
          </div>
          <div style={{ padding: '20px 22px 22px' }}>
            <Btn full size="lg" iconR="arrow" href={ev.url ?? '/browse'}>
              Get tickets
            </Btn>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 13, color: 'var(--faint)' }}>
              <Icon name="lock" size={14} /> Protected by neop&apos;s 100% guarantee
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const tiers = tiersFor(ev.priceFrom);
  const [tier, setTier] = useState(tiers[0].id);
  const [qty, setQty] = useState(2);
  const sel = tiers.find((t) => t.id === tier)!;
  const subtotal = sel.price * qty;

  return (
    <aside style={{ position: 'sticky', top: 104 }}>
      <div style={{ borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '22px 22px 6px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--faint)' }}>
            Select tickets
          </div>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tiers.map((t) => {
            const on = tier === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
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
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{t.name}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {ev.currency}
                    {t.price}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--dim)' }}>{t.desc}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: t.hot ? 'var(--accent-2)' : 'var(--faint)' }}>{t.left}</span>
                </div>
              </button>
            );
          })}
        </div>
        {/* qty */}
        <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Quantity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="focus-ring" style={qtyBtn} aria-label="Decrease quantity">
              <Icon name="minus" size={16} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(8, q + 1))} className="focus-ring" style={qtyBtn} aria-label="Increase quantity">
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
              Subtotal · {qty} × {ev.currency}
              {sel.price}
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {ev.currency}
              {subtotal}
            </span>
          </div>
          <Btn full size="lg" iconR="arrow" href={`/checkout?event=${ev.id}&tier=${tier}&qty=${qty}`}>
            Continue to checkout
          </Btn>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 13, color: 'var(--faint)' }}>
            <Icon name="lock" size={14} /> Protected by neop&apos;s 100% guarantee
          </div>
        </div>
      </div>
    </aside>
  );
}
