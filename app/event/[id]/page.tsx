import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '@/components/EventCard';
import { Icon } from '@/components/Icon';
import { Img } from '@/components/Img';
import { SecHead } from '@/components/SecHead';
import { TicketsAndSeatingPlan } from '@/components/TicketsAndSeatingPlan';
import { fetchEvent, fetchEventListings, fetchEvents, fetchEventSeatingPlan, fetchSeatingPlanSvgMarkup } from '@/lib/api';
import { CATEGORIES, categoryById } from '@/lib/categories';
import { fmtDateLong, fmtTime } from '@/lib/format';

export const revalidate = 120;

export default async function EventPage({ params }: { params: { id: string } }) {
  const ev = await fetchEvent(params.id, revalidate).catch(() => null);
  if (!ev) notFound();

  const cat = categoryById(ev.category);
  const typeId = CATEGORIES.find((c) => c.id === ev.category)?.typeId ?? undefined;
  const [moreRes, categories, seatingPlan] = await Promise.all([
    fetchEvents({ typeId, perPage: 8, revalidate }).catch(() => null),
    fetchEventListings(params.id, revalidate),
    fetchEventSeatingPlan(params.id),
  ]);
  const svgMarkup = seatingPlan ? await fetchSeatingPlanSvgMarkup(seatingPlan.svgUrl) : null;
  const more = (moreRes?.events ?? []).filter((e) => e.id !== ev.id).slice(0, 3);

  return (
    <div>
      {/* hero */}
      <div style={{ position: 'relative', marginTop: '-88px' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Img src={ev.image} alt={ev.title} style={{ width: '100%', height: '100%' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, var(--bg) 1%, rgba(7,7,11,.45) 45%, rgba(7,7,11,.6))',
            }}
          />
        </div>
        <div style={{ position: 'relative', maxWidth: 'var(--maxw)', margin: '0 auto', padding: '128px 28px 40px' }}>
          <Link
            href={`/browse?cat=${ev.category}`}
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
              marginBottom: 'min(28vh,260px)',
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
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '40px 28px 0' }}>
        {/* tickets (left) + seating plan (right) */}
        <TicketsAndSeatingPlan ev={ev} categories={categories} seatingPlan={seatingPlan} svgMarkup={svgMarkup} />

        {/* lineup / venue */}
        <div style={{ maxWidth: 760, marginTop: 56 }}>
          {ev.lineup.length > 0 && (
            <div>
              <h3 className="serif" style={{ fontSize: 26, margin: '0 0 18px' }}>
                Lineup
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {ev.lineup.map((a, i) => (
                  <span
                    key={a}
                    style={{
                      padding: '11px 18px',
                      borderRadius: 12,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      fontSize: 15.5,
                      fontWeight: i === 0 ? 700 : 500,
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* venue */}
          <div style={{ marginTop: ev.lineup.length > 0 ? 44 : 0 }}>
            <h3 className="serif" style={{ fontSize: 26, margin: '0 0 18px' }}>
              Venue
            </h3>
            <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ position: 'relative', height: 200 }} className="imgwrap">
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.5,
                    background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 12px, transparent 12px 24px)',
                  }}
                />
                <div style={{ position: 'absolute', left: 24, bottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--grad)', display: 'grid', placeItems: 'center' }}>
                    <Icon name="pin" size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{ev.venue}</div>
                    <div style={{ fontSize: 14, color: 'var(--dim)' }}>
                      {ev.city}, {ev.country}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* more like this */}
      {more.length > 0 && (
        <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '72px 28px 0' }}>
          <SecHead kicker="Keep exploring" title="More like this" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {more.map((e, i) => (
              <EventCard key={e.id} ev={e} i={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
