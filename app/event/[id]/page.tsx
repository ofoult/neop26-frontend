import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CountryFlag } from '@/components/Flag';
import { EventCard } from '@/components/EventCard';
import { Icon } from '@/components/Icon';
import { Img } from '@/components/Img';
import { SecHead } from '@/components/SecHead';
import { Skeleton } from '@/components/Skeleton';
import { TicketsAndSeatingPlan } from '@/components/TicketsAndSeatingPlan';
import { fetchEvent, fetchEventListings, fetchEvents, fetchEventSeatingPlan, fetchSeatingPlanSvgMarkup } from '@/lib/api';
import { CATEGORIES, categoryById } from '@/lib/categories';
import { countryCodeFor } from '@/lib/countryCodes';
import { fmtDateLong, fmtTime } from '@/lib/format';
import type { NeopEvent } from '@/lib/types';

export const revalidate = 120;

export default async function EventPage({ params }: { params: { id: string } }) {
  // Only the core event record gates the first paint — everything else
  // (ticket categories, the seating-plan SVG, "more like this") streams in
  // afterward via its own Suspense boundary, so a slow Gigsberg listing/SVG
  // fetch no longer blocks the hero from appearing.
  const ev = await fetchEvent(params.id, revalidate).catch(() => null);
  if (!ev) notFound();

  const cat = categoryById(ev.category);
  const countryCode = countryCodeFor(ev.country);

  return (
    <div>
      {/* hero */}
      <div style={{ position: 'relative', marginTop: '-88px' }}>
        <div style={{ position: 'absolute', inset: 0, height: 'clamp(340px,46vh,460px)' }}>
          <Img src={ev.image} alt={ev.title} style={{ width: '100%', height: '100%' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, var(--bg) 1%, rgba(7,7,11,.45) 45%, rgba(7,7,11,.6))',
            }}
          />
        </div>
        <div style={{ position: 'relative', maxWidth: 'var(--maxw)', margin: '0 auto', padding: '112px 28px 40px' }}>
          <Link
            href={ev.performerId ? `/performer/${ev.performerId}` : `/browse?cat=${ev.category}`}
            className="focus-ring"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,.2)',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 28,
            }}
          >
            <Icon name="arrowL" size={16} /> Back
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {ev.hot && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'var(--grad)',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <Icon name="bolt" size={13} /> Trending
              </span>
            )}
            <span
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,.12)',
                backdropFilter: 'blur(10px)',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {cat?.label} · {ev.genre}
            </span>
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,.8)',
              marginBottom: 10,
            }}
          >
            {ev.artist}
          </div>
          <h1 className="serif" style={{ fontSize: 'clamp(48px,8vw,108px)', margin: 0, lineHeight: 0.92, letterSpacing: '-0.02em' }}>
            {ev.title}
          </h1>
          <div style={{ display: 'flex', gap: 26, marginTop: 24, flexWrap: 'wrap', color: 'rgba(255,255,255,.9)', fontSize: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name="cal" size={19} /> {fmtDateLong(ev.date)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name="clock" size={19} /> {fmtTime(ev.date)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name="pin" size={19} /> {ev.venue}, {ev.city}
            </span>
            {ev.country && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {countryCode && <CountryFlag code={countryCode} width={19} />}
                {ev.country}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '40px 28px 0' }}>
        {/* tickets (left) + seating plan (right) */}
        <Suspense fallback={<TicketsAndSeatingPlanSkeleton />}>
          <TicketsAndSeatingPlanData ev={ev} eventId={params.id} />
        </Suspense>
      </div>

      {/* more like this */}
      <Suspense fallback={<MoreLikeThisSkeleton />}>
        <MoreLikeThis ev={ev} />
      </Suspense>
    </div>
  );
}

/** Fetches + renders the ticket picker and seating plan; streamed in via Suspense above. */
async function TicketsAndSeatingPlanData({ ev, eventId }: { ev: NeopEvent; eventId: string }) {
  const [categories, seatingPlan] = await Promise.all([
    fetchEventListings(eventId, revalidate),
    fetchEventSeatingPlan(eventId),
  ]);
  const svgMarkup = seatingPlan ? await fetchSeatingPlanSvgMarkup(seatingPlan.svgUrl) : null;
  return <TicketsAndSeatingPlan ev={ev} categories={categories} seatingPlan={seatingPlan} svgMarkup={svgMarkup} />;
}

/** Roughly matches TicketsAndSeatingPlan's 400px + 1fr layout to minimize shift when it swaps in. */
function TicketsAndSeatingPlanSkeleton() {
  return (
    <div className="tickets-plan-grid has-plan">
      <div className="tickets-plan-tickets" style={{ borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--border)', padding: 22 }}>
        <Skeleton style={{ height: 13, width: 110, marginBottom: 18 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ borderRadius: 16, border: '1px solid var(--border)', padding: '16px 18px' }}>
              <Skeleton style={{ height: 16, width: '55%', marginBottom: 10 }} />
              <Skeleton style={{ height: 12, width: '35%' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="tickets-plan-seatmap">
        <Skeleton style={{ height: 26, width: 170, marginBottom: 18 }} />
        <Skeleton style={{ height: 520, borderRadius: 18 }} />
      </div>
    </div>
  );
}

/** Fetches + renders the "more like this" strip; streamed in via Suspense above. */
async function MoreLikeThis({ ev }: { ev: NeopEvent }) {
  const typeId = CATEGORIES.find((c) => c.id === ev.category)?.typeId ?? undefined;
  const moreRes = await fetchEvents({ typeId, perPage: 8, revalidate }).catch(() => null);
  const more = (moreRes?.events ?? []).filter((e) => e.id !== ev.id).slice(0, 3);
  if (more.length === 0) return null;

  return (
    <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '72px 28px 0' }}>
      <SecHead kicker="Keep exploring" title="More like this" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
        {more.map((e, i) => (
          <EventCard key={e.id} ev={e} i={i} />
        ))}
      </div>
    </section>
  );
}

function MoreLikeThisSkeleton() {
  return (
    <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '72px 28px 0' }}>
      <SecHead kicker="Keep exploring" title="More like this" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ aspectRatio: '4/5', borderRadius: 18 }} />
        ))}
      </div>
    </section>
  );
}
