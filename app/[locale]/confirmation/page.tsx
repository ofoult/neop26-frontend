'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Img } from '@/components/Img';
import { Btn } from '@/components/ui';
import { fetchEvent } from '@/lib/api';
import { fmtDate, fmtTime } from '@/lib/format';
import { tierById } from '@/lib/tickets';
import type { NeopEvent } from '@/lib/types';

function Stub({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 600, marginBottom: 3 }}>{l.toUpperCase()}</div>
      <div style={{ fontSize: 15.5, fontWeight: 600 }}>{v}</div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 28px', textAlign: 'center' }}>{children}</div>;
}

function ConfirmInner() {
  const locale = useLocale();
  const t = useTranslations('Confirmation');
  const tTier = useTranslations('TicketTiers');
  const params = useSearchParams();
  const eventId = params.get('event');
  const tierId = params.get('tier') ?? 'ga';
  const qty = Math.min(8, Math.max(1, Number(params.get('qty') ?? '2') || 2));

  const [ev, setEv] = useState<NeopEvent | null | undefined>(undefined);
  // Order code is carried in the URL so a refresh keeps the same ticket.
  const [code] = useState(() => params.get('code') ?? `NEOP-${Math.floor(1000 + Math.random() * 9000)}`);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!eventId) {
      setEv(null);
      return;
    }
    let alive = true;
    fetchEvent(eventId)
      .then((e) => alive && setEv(e))
      .catch(() => alive && setEv(null));
    return () => {
      alive = false;
    };
  }, [eventId]);

  if (ev === undefined) {
    return <Centered><p style={{ color: 'var(--dim)' }}>{t('finalising')}</p></Centered>;
  }

  const tier = ev && ev.priceFrom != null ? tierById(ev.priceFrom, tierId) : undefined;
  if (!ev) {
    return (
      <Centered>
        <h1 className="serif" style={{ fontSize: 40, margin: '0 0 12px' }}>{t('orderNotFound')}</h1>
        <Btn href="/browse" iconR="arrow">{t('findEvents')}</Btn>
      </Centered>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 28px 0', textAlign: 'center' }}>
      <div
        className="up"
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--grad)',
          display: 'grid',
          placeItems: 'center',
          margin: '20px auto 24px',
          boxShadow: '0 12px 40px -10px var(--accent)',
        }}
      >
        <Icon name="check" size={36} stroke={2.4} />
      </div>
      <h1 className="serif up" style={{ fontSize: 'clamp(36px,6vw,56px)', margin: '0 0 12px', lineHeight: 1, animationDelay: '60ms' }}>
        {t('goingTitle')}
      </h1>
      <p className="up" style={{ color: 'var(--dim)', fontSize: 17, margin: '0 0 32px', animationDelay: '100ms' }}>
        {t('confirmationSent')}
      </p>

      {/* ticket stub */}
      <div
        className="up"
        style={{
          animationDelay: '160ms',
          textAlign: 'start',
          background: 'var(--bg-2)',
          borderRadius: 22,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ position: 'relative', height: 150 }}>
          <Img src={ev.image} alt={ev.title} style={{ width: '100%', height: '100%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-2), transparent 65%)' }} />
          <div style={{ position: 'absolute', insetInlineStart: 22, bottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,.8)' }}>
              {ev.artist}
            </div>
            <div className="serif" style={{ fontSize: 30, lineHeight: 1 }}>
              {ev.title}
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', borderTop: '2px dashed var(--border-2)' }}>
          <span style={{ position: 'absolute', left: -9, top: -9, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg)' }} />
          <span style={{ position: 'absolute', right: -9, top: -9, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg)' }} />
        </div>
        <div style={{ padding: '22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Stub l={t('date')} v={fmtDate(ev.date, locale)} />
          <Stub l={t('time')} v={fmtTime(ev.date, locale)} />
          <Stub l={t('venue')} v={ev.venue} />
          <Stub l={t('city')} v={`${ev.city}, ${ev.country}`} />
          <Stub l={t('ticket')} v={tTier(tier?.id ?? 'ga')} />
          <Stub l={t('quantity')} v={t('ticketsCount', { count: qty })} />
          <div
            style={{
              gridColumn: 'span 2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border)',
              paddingTop: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase' }}>{t('order')}</div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.02em' }}>{code}</div>
            </div>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: '#fff', padding: 6 }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50%/12px 12px',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="up" style={{ display: 'flex', gap: 12, marginTop: 24, animationDelay: '220ms' }}>
        <Btn full size="lg" variant="soft" href="/">
          {t('backHome')}
        </Btn>
        <Btn full size="lg" iconR="arrow" href="/browse">
          {t('findMoreEvents')}
        </Btn>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  const t = useTranslations('Common');
  return (
    <Suspense fallback={<Centered><p style={{ color: 'var(--dim)' }}>{t('loading')}</p></Centered>}>
      <ConfirmInner />
    </Suspense>
  );
}
