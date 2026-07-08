import { CityMarquee } from '@/components/CityMarquee';
import { EventCard } from '@/components/EventCard';
import { Hero } from '@/components/Hero';
import { Icon, type IconName } from '@/components/Icon';
import { SecHead } from '@/components/SecHead';
import { fetchEvents } from '@/lib/api';
import type { NeopEvent } from '@/lib/types';

export const revalidate = 120;

const GUARANTEES: [IconName, string, string][] = [
  ['lock', 'Every seat guaranteed', "If your event is cancelled or tickets don't arrive, you're covered — full refund, no questions."],
  ['globe', '90+ countries', 'From Tokyo to Rio, browse and book verified tickets to events on every continent.'],
  ['ticket', 'Instant mobile entry', 'Tickets land in your wallet seconds after checkout. Scan and walk straight in.'],
];

export default async function HomePage() {
  // Pull a pool of upcoming events plus a festival-specific set, in parallel.
  const [pool, festPool] = await Promise.all([
    fetchEvents({ perPage: 80, revalidate }).catch(() => null),
    fetchEvents({ typeId: 4, perPage: 12, revalidate }).catch(() => null),
  ]);

  const events: NeopEvent[] = pool?.events ?? [];

  if (events.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 28px', textAlign: 'center' }}>
        <h1 className="serif" style={{ fontSize: 44, margin: '0 0 14px' }}>No events to show</h1>
        <p style={{ color: 'var(--dim)', fontSize: 16, lineHeight: 1.6 }}>
          The neop backend didn&apos;t return any events. Make sure it&apos;s running on{' '}
          <code>{process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}</code> and has synced data.
        </p>
      </div>
    );
  }

  // Priced inventory surfaces as "trending"; pad with the rest to fill the grid.
  const priced = events.filter((e) => e.hot);
  const rest = events.filter((e) => !e.hot);
  const trending = [...priced, ...rest].slice(0, 5);
  // Weekend strip: events not already shown in the trending grid.
  const trendingIds = new Set(trending.map((e) => e.id));
  const weekend = events.filter((e) => !trendingIds.has(e.id)).slice(0, 6);
  const fests = (festPool?.events ?? []).slice(0, 3);

  return (
    <div>
      <Hero events={trending} />
      <CityMarquee />

      {/* trending */}
      <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '56px 28px 0' }}>
        <SecHead kicker="Selling fast" title="Trending right now" action="See all" actionHref="/browse" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 18 }}>
          <div style={{ gridRow: 'span 2' }}>
            <EventCard ev={trending[0]} i={0} wide />
          </div>
          {trending.slice(1, 5).map((e, i) => (
            <EventCard key={e.id} ev={e} i={i + 1} />
          ))}
        </div>
      </section>

      {/* this weekend */}
      {weekend.length > 0 && (
        <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '72px 28px 0' }}>
          <SecHead kicker="Don't miss out" title="On this weekend" action="Browse dates" actionHref="/browse" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {weekend.map((e, i) => (
              <EventCard key={e.id} ev={e} i={i} />
            ))}
          </div>
        </section>
      )}

      {/* guarantee band */}
      <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '80px 28px 0' }}>
        <div style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', border: '1px solid var(--border)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--grad)', opacity: 0.16 }} />
          <div
            style={{
              position: 'relative',
              padding: '54px 48px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 36,
            }}
          >
            {GUARANTEES.map(([ic, t, d]) => (
              <div key={t}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 18,
                    color: 'var(--accent)',
                  }}
                >
                  <Icon name={ic} size={22} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 8 }}>{t}</div>
                <p style={{ fontSize: 14.5, color: 'var(--dim)', lineHeight: 1.6, margin: 0 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* festivals spotlight */}
      {fests.length > 0 && (
        <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '80px 28px 0' }}>
          <SecHead kicker="Season highlights" title="Festivals worth the flight" action="All festivals" actionHref="/browse?cat=festivals" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {fests.map((e, i) => (
              <EventCard key={e.id} ev={e} i={i} wide />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
