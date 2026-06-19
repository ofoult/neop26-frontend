'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type CSSProperties } from 'react';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Img } from '@/components/Img';
import { Btn } from '@/components/ui';
import { fetchEvent } from '@/lib/api';
import { fmtDateLong } from '@/lib/format';
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
      <p style={{ color: 'var(--dim)', fontSize: 16 }}>Loading your order…</p>
    </Centered>;
  }

  const tier = ev && ev.priceFrom != null ? tierById(ev.priceFrom, tierId) : undefined;
  if (!ev || !tier) {
    return (
      <Centered>
        <h1 className="serif" style={{ fontSize: 40, margin: '0 0 12px' }}>We lost your order</h1>
        <p style={{ color: 'var(--dim)', fontSize: 16, marginBottom: 24 }}>
          That checkout link is missing details or the event is no longer priced.
        </p>
        <Btn href="/browse" iconR="arrow">
          Browse events
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
        href={`/event/${ev.id}`}
        className="focus-ring"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--dim)', fontSize: 14.5, fontWeight: 600, marginBottom: 20 }}
      >
        <Icon name="arrowL" size={16} /> Back to event
      </Link>
      <h1 className="serif" style={{ fontSize: 'clamp(34px,5vw,52px)', margin: '0 0 8px', lineHeight: 1 }}>
        Checkout
      </h1>
      <p style={{ color: 'var(--dim)', fontSize: 16, margin: '0 0 32px' }}>
        You&apos;re seconds away. Tickets are held for 10:00.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40, alignItems: 'start' }}>
        {/* form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <section>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={stepDot}>1</span> Your details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Full name" placeholder="Alex Rivera" value={name} onChange={setName} span={2} />
              <Field label="Email" placeholder="alex@email.com" value={email} onChange={setEmail} type="email" />
              <Field label="Phone" placeholder="+1 555 000 0000" type="tel" />
            </div>
          </section>
          <section>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={stepDot}>2</span> Payment
            </h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {['Card', 'Apple Pay', 'PayPal'].map((m) => {
                const on = method === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className="focus-ring"
                    style={{
                      flex: 1,
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
                    {m}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Card number" placeholder="1234 5678 9012 3456" span={2} />
              <Field label="Expiry" placeholder="MM / YY" />
              <Field label="CVC" placeholder="123" />
            </div>
          </section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--faint)' }}>
            <Icon name="lock" size={15} /> Payments are encrypted and secured. This is a demo — no card is charged.
          </div>
        </div>

        {/* summary */}
        <aside
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
            <div className="serif" style={{ position: 'absolute', left: 20, bottom: 14, fontSize: 24, lineHeight: 1 }}>
              {ev.title}
            </div>
          </div>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: 13.5, color: 'var(--dim)', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="cal" size={15} /> {fmtDateLong(ev.date)}
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
              <Row l={`${tier.name} × ${qty}`} r={`${ev.currency}${sub}`} />
              <Row l="Service fees" r={`${ev.currency}${fees}`} dim />
              <Row l="Delivery · mobile" r="Free" dim />
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
              <span style={{ fontSize: 16, fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {ev.currency}
                {total}
              </span>
            </div>
            <div style={{ marginTop: 18 }}>
              <Btn full size="lg" icon="lock" onClick={pay}>
                Pay {ev.currency}
                {total}
              </Btn>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Centered><p style={{ color: 'var(--dim)' }}>Loading…</p></Centered>}>
      <CheckoutInner />
    </Suspense>
  );
}
