import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventCard } from '@/components/EventCard';
import { Hero } from '@/components/Hero';
import { Icon, type IconName } from '@/components/Icon';
import { SecHead } from '@/components/SecHead';
import { fetchEvents } from '@/lib/api';
import { hreflangAlternates, localePath } from '@/lib/hreflang';
import type { NeopEvent } from '@/lib/types';

export const revalidate = 120;

// Only the canonical/hreflang alternates for "/" — title/description/OG stay
// inherited from the root layout's generateMetadata (see its comment for why
// this is the only page that needs its own metadata beyond that default).
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  return {
    alternates: {
      canonical: localePath('/', params.locale),
      languages: hreflangAlternates('/'),
    },
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  // Calling getTranslations() without an explicit locale falls back to
  // reading it from `headers()`, which opts the whole route into dynamic
  // (uncached) rendering — setRequestLocale must be called in every page,
  // not just the root layout, since Next.js can render layouts and pages
  // independently. See https://next-intl.dev/docs/routing/setup#static-rendering.
  setRequestLocale(params.locale);
  const t = await getTranslations('Home');

  const GUARANTEES: [IconName, string, string][] = [
    ['lock', t('guaranteeTitle'), t('guaranteeBody')],
    ['globe', t('countriesTitle'), t('countriesBody')],
    ['ticket', t('instantTitle'), t('instantBody')],
  ];

  // Pull a pool of upcoming events plus a festival-specific set, in parallel.
  const [pool, festPool] = await Promise.all([
    fetchEvents({ perPage: 80, revalidate }).catch(() => null),
    fetchEvents({ typeId: 4, perPage: 12, revalidate }).catch(() => null),
  ]);

  const events: NeopEvent[] = pool?.events ?? [];

  if (events.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 28px', textAlign: 'center' }}>
        <h1 className="serif" style={{ fontSize: 44, margin: '0 0 14px' }}>{t('noEventsTitle')}</h1>
        <p style={{ color: 'var(--dim)', fontSize: 16, lineHeight: 1.6 }}>
          {t.rich('noEventsBody', {
            url: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
            code: (chunks) => <code>{chunks}</code>,
          })}
        </p>
      </div>
    );
  }

  // Priced inventory surfaces as "trending"; pad with the rest to fill the grid.
  const priced = events.filter((e) => e.hot);
  const rest = events.filter((e) => !e.hot);
  const heroEvents = [...priced, ...rest].slice(0, 5);
  const trending = [...priced, ...rest].slice(0, 4);
  // Weekend strip: events not already shown in the trending grid.
  const trendingIds = new Set(trending.map((e) => e.id));
  const weekend = events.filter((e) => !trendingIds.has(e.id)).slice(0, 4);
  const fests = (festPool?.events ?? []).slice(0, 4);

  return (
    <div>
      <Hero events={heroEvents} />

      {/* trending */}
      <section className="page-section" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        <SecHead kicker={t('trendingKicker')} title={t('trendingTitle')} action={t('seeAll')} actionHref="/browse" />
        <div className="event-grid">
          {trending.map((e, i) => (
            <EventCard key={e.id} ev={e} i={i + 1}  />
          ))}
        </div>
      </section>

      {/* this weekend */}
      {weekend.length > 0 && (
        <section className="page-section" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <SecHead kicker={t('weekendKicker')} title={t('weekendTitle')} action={t('browseDates')} actionHref="/browse" />
          <div className="event-grid">
            {weekend.map((e, i) => (
              <EventCard key={e.id} ev={e} i={i}  />
            ))}
          </div>
        </section>
      )}

      {/* festivals spotlight */}
      {fests.length > 0 && (
        <section className="page-section" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <SecHead kicker={t('festivalsKicker')} title={t('festivalsTitle')} action={t('allFestivals')} actionHref="/browse/festivals" />
          <div className="event-grid">
            {fests.map((e, i) => (
              <EventCard key={e.id} ev={e} i={i}  />
            ))}
          </div>
        </section>
      )}

      {/* guarantee band */}
      <section className="page-section" style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        <div style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', border: '1px solid var(--border)' }}>
          <div style={{ position: 'absolute', inset: 0, background:"linear-gradient(rgba(7,7,11,0.82), rgba(7,7,11,0.32)), var(--grad)" }} />
          <div
            className="guarantee-band guarantee-grid"
            style={{
              position: 'relative',
            }}
          >
            {GUARANTEES.map(([ic, title, desc]) => (
              <div key={title}>
                <div
                  style={{
                    width: 128,
                    height: 58,
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
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 8 }}>{title}</div>
                <p style={{ fontSize: 14.5, color: 'var(--dim)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
