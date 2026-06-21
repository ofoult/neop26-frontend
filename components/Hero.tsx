'use client';

import { useEffect, useState } from 'react';
import { fmtDate } from '@/lib/format';
import type { NeopEvent } from '@/lib/types';
import { Icon } from './Icon';
import { Img } from './Img';
import { SearchBar } from './SearchBar';
import { Btn } from './ui';

const ROTATE_MS = 10000;

// Editorial hero — rotates through the trending events every 10s. Auto-advance
// pauses while the user interacts (hover or keyboard focus) with the hero, and
// the dots at the bottom jump straight to a given event.
export function Hero({ events }: { events: NeopEvent[] }) {
  const count = events.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const i = count ? index % count : 0;
  const feat = events[i];

  // (Re)start the timer whenever the active slide changes or pause toggles, so
  // each event gets a full 10s and manual dot selection resets the countdown.
  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setTimeout(() => setIndex((p) => (p + 1) % count), ROTATE_MS);
    return () => clearTimeout(t);
  }, [i, paused, count]);

  if (!feat) return null;

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      style={{
        position: 'relative',
        minHeight: '86vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        marginTop: '-88px',
        paddingTop: 88,
      }}
    >
      {/* Background swaps with the active event. Keyed for a soft fade-in. */}
      <div key={feat.id} className="hero-fade" style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
        <Img src={feat.image} alt={feat.title} style={{ width: '100%', height: '100%' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--bg) 2%, rgba(7,7,11,.4) 40%, rgba(7,7,11,.55))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(120% 80% at 80% 10%, transparent 40%, var(--bg))',
          }}
        />
      </div>
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '0 28px 4px', width: '100%' }}>
        {/* Event-specific content; keyed so its entrance animations replay on change. */}
        <div key={feat.id}>
          <div
            className="up"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 15px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,.2)',
              fontSize: 13.5,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            <Icon name="bolt" size={14} /> Featured · {feat.city}
          </div>
          <h1 className="up" style={{ margin: 0, animationDelay: '40ms' }}>
            <span
              style={{
                display: 'block',
                fontSize: 16,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'rgba(255,255,255,.75)',
                marginBottom: 14,
              }}
            >
              {feat.artist}
            </span>
            <span
              className="serif"
              style={{ fontSize: 'clamp(52px, 9vw, 128px)', lineHeight: 0.92, letterSpacing: '-0.02em', display: 'block' }}
            >
              {feat.title}
            </span>
          </h1>
          <p
            className="up"
            style={{ fontSize: 19, color: 'rgba(255,255,255,.85)', maxWidth: 540, lineHeight: 1.55, margin: '22px 0 26px', animationDelay: '100ms' }}
          >
            {feat.blurb}
          </p>
          <div className="up" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', animationDelay: '140ms' }}>
            <Btn size="lg" iconR="arrow" href={`/event/${feat.id}`}>
              Get tickets{feat.priceFrom != null ? ` · from ${feat.currency}${feat.priceFrom}` : ''}
            </Btn>
            <Btn size="lg" variant="ghost" icon="play">
              Watch trailer
            </Btn>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: 'rgba(255,255,255,.85)', fontSize: 14.5, marginLeft: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="cal" size={16} /> {fmtDate(feat.date)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="pin" size={16} /> {feat.venue}
              </span>
            </div>
          </div>
        </div>

        <div className="up" style={{ margin: '42px 0 22px', maxWidth: 920, animationDelay: '200ms' }}>
          <SearchBar />
        </div>

        {/* Carousel dots */}
        {count > 1 && (
          <div style={{ display: 'flex', gap: 9, marginBottom: 40 }}>
            {events.map((e, idx) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setIndex(idx)}
                aria-label={`Show featured event ${idx + 1}: ${e.title}`}
                aria-current={idx === i}
                style={{
                  width: idx === i ? 28 : 9,
                  height: 9,
                  borderRadius: 999,
                  padding: 0,
                  border: 'none',
                  cursor: 'pointer',
                  background: idx === i ? 'var(--text)' : 'rgba(255,255,255,.35)',
                  transition: 'width .3s, background .3s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
