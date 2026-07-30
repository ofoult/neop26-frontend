'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type CSSProperties } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Img } from '@/components/Img';
import { Btn } from '@/components/ui';
import { fetchEvent } from '@/lib/api';
import { fmtDateLong } from '@/lib/format';
import { eventHref } from '@/lib/slug';
import { SERVICE_FEE_RATE, tierById } from '@/lib/tickets';
import type { NeopEvent } from '@/lib/types';

const stepDot: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: 'var(--grad)',
  display: 'inline-grid',
  placeItems: 'center',
  fontSize: 13,
  fontWeight: 700,
  color: '#fff',
};

function Row({ l, r, dim }: { l: string; r: string; dim?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: dim ? 'var(--dim)' : 'var(--text)' }}>{l}</span>
      <span style={{ fontWeight: 600 }}>{r}</span>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 28px', textAlign: 'center' }}>{children}</div>;
}

function CheckoutInner() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Checkout');
  const tTier = useTranslations('TicketTiers');
  const params = useSearchParams();
  const eventId = params.get('event');
  const tierId = params.get('tier') ?? 'ga';
  const qty = Math.min(8, Math.max(1, Number(params.get('qty') ?? '2') || 2));

  const [ev, setEv] = useState<NeopEvent | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState('Card');

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
    return <Centered>
      <p style={{ color: 'var(--dim)', fontSize: 16 }}>{t('loadingOrder')}</p>
    </Centered>;
  }

  const tier = ev && ev.priceFrom != null ? tierById(ev.priceFrom, tierId) : undefined;
  if (!ev || !tier) {
    return (
      <Centered>
        <h1 className="serif" style={{ fontSize: 40, margin: '0 0 12px' }}>{t('lostOrderTitle')}</h1>
        <p style={{ color: 'var(--dim)', fontSize: 16, marginBottom: 24 }}>
          {t('lostOrderBody')}
        </p>
        <Btn href="/browse" iconR="arrow">
          {t('browseEvents')}
        </Btn>
      </Centered>
    );
  }

  const sub = tier.price * qty;
  const fees = Math.round(sub * SERVICE_FEE_RATE);
  const total = sub + fees;

  const pay = () => {
    const code = `NEOP-${ev.id.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    router.push(`/confirmation?event=${ev.id}&tier=${tier.id}&qty=${qty}&code=${code}`);
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 28px 0' }}>
      <Link
        href={eventHref(ev)}
        className="focus-ring"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--dim)', fontSize: 14.5, fontWeight: 600, marginBottom: 20 }}
      >
        <Icon name="arrowL" size={16} /> {t('backToEvent')}
      </Link>
      <h1 className="serif" style={{ fontSize: 'clamp(34px,5vw,52px)', margin: '0 0 8px', lineHeight: 1 }}>
        {t('title')}
      </h1>
      <p style={{ color: 'var(--dim)', fontSize: 16, margin: '0 0 32px' }}>
        {t('heldNotice')}
      </p>

      <div className="checkout-grid">
        {/* form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <section>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={stepDot}>1</span> {t('step1')}
            </h3>
            <div className="checkout-fields-grid">
              <Field label={t('fullName')} placeholder="Alex Rivera" value={name} onChange={setName} span={2} />
              <Field label={t('email')} placeholder="alex@email.com" value={email} onChange={setEmail} type="email" />
              <Field label={t('phone')} placeholder="+1 555 000 0000" type="tel" />
            </div>
          </section>
          <section>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={stepDot}>2</span> {t('step2')}
            </h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {['Card', 'Apple Pay', 'PayPal'].map((m) => {
                const on = method === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className="focus-ring"
                    style={{
                      flex: '1 1 100px',
                      padding: '14px',
                      borderRadius: 12,
                      textAlign: 'center',
                      fontSize: 14.5,
                      fontWeight: 600,
                      border: on ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: on ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {m === 'Card' ? t('methodCard') : m}
                  </button>
                );
              })}
            </div>
            <div className="checkout-fields-grid">
              <Field label={t('cardNumber')} placeholder="1234 5678 9012 3456" span={2} />
              <Field label={t('expiry')} placeholder="MM / YY" />
              <Field label={t('cvc')} placeholder="123" />
            </div>
          </section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--faint)' }}>
            <Icon name="lock" size={15} /> {t('securePayment')}
          </div>
        </div>

        {/* summary */}
        <aside
          className="checkout-summary"
          style={{
            position: 'sticky',
            top: 104,
            borderRadius: 22,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', height: 140 }}>
            <Img src={ev.image} alt={ev.title} style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-2), transparent 70%)' }} />
            <div className="serif" style={{ position: 'absolute', insetInlineStart: 20, bottom: 14, fontSize: 24, lineHeight: 1 }}>
              {ev.title}
            </div>
          </div>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: 13.5, color: 'var(--dim)', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="cal" size={15} /> {fmtDateLong(ev.date, locale)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="pin" size={15} /> {ev.venue}, {ev.city}
              </span>
            </div>
            <div
              style={{
                borderTop: '1px solid var(--border)',
                margin: '16px 0',
                paddingTop: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
                fontSize: 14.5,
              }}
            >
              <Row l={`${tTier(tier.id)} × ${qty}`} r={`${ev.currency}${sub}`} />
              <Row l={t('serviceFees')} r={`${ev.currency}${fees}`} dim />
              <Row l={t('deliveryMobile')} r={t('free')} dim />
            </div>
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 600 }}>{t('total')}</span>
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {ev.currency}
                {total}
              </span>
            </div>
            <div style={{ marginTop: 18 }}>
              <Btn full size="lg" icon="lock" onClick={pay}>
                {t('pay', { amount: `${ev.currency}${total}` })}
              </Btn>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const t = useTranslations('Common');
  return (
    <Suspense fallback={<Centered><p style={{ color: 'var(--dim)' }}>{t('loading')}</p></Centered>}>
      <CheckoutInner />
    </Suspense>
  );
}
