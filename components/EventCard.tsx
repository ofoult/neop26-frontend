'use client';

import Link from 'next/link';
import { useState } from 'react';
import { categoryById } from '@/lib/categories';
import { fmtDate } from '@/lib/format';
import type { NeopEvent } from '@/lib/types';
import { Icon } from './Icon';
import { Img } from './Img';

// Editorial card — image-forward with a serif title. (The reference also ships a
// "kinetic" ticket-stub variant behind the tweaks panel, which is omitted in
// production; editorial is the canonical design.)
export function EventCard({ ev, i = 0, wide }: { ev: NeopEvent; i?: number; wide?: boolean }) {
  const [h, setH] = useState(false);
  const cat = categoryById(ev.category);
  // Cap the entrance stagger so infinitely-scrolled cards (high i) don't sit
  // invisible for seconds — that delay would leave a tall blank gap at the bottom.
  const animationDelay = `${Math.min(i, 11) * 60}ms`;

  // Events with a known performer route to that artist's event list; the rare
  // event with neither performer1_id nor performer2_id falls back to going
  // straight to its own detail page.
  const href = ev.performerId ? `/performer/${ev.performerId}` : `/event/${ev.id}`;

  return (
    <Link
      href={href}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className="focus-ring up"
      style={{ textAlign: 'left', display: 'block', width: '100%', animationDelay }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          transition: 'border-color .3s',
          borderColor: h ? 'var(--border-2)' : 'var(--border)',
        }}
      >
        <Img src={ev.image} alt={ev.title} zoom={h} style={{ aspectRatio: wide ? '16/10' : '4/5' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(7,7,11,.9) 4%, rgba(7,7,11,.15) 45%, transparent)',
          }}
        />
        {ev.hot && (
          <span
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.14)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.25)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Icon name="bolt" size={13} /> Trending
          </span>
        )}
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'rgba(255,255,255,.8)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <span>{cat?.label}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{ev.genre}</span>
          </div>
          <div className="serif" style={{ fontSize: wide ? 34 : 25, lineHeight: 1.04, letterSpacing: '-0.01em' }}>
            {ev.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12 }}>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.82)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="pin" size={14} /> {[ev.city, ev.country].filter(Boolean).join(', ')} · {fmtDate(ev.date)}
              {ev.performerEventCount > 1 && ` · ${ev.performerEventCount} events for this artist`}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: h ? 1 : 0.85,
                transition: 'opacity .2s',
              }}
            >
              {ev.priceFrom != null ? `from ${ev.currency}${ev.priceFrom}` : 'View tickets'}
              <Icon name="arrow" size={15} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
