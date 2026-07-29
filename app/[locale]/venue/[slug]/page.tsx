import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CountryFlag } from '@/components/Flag';
import { Icon } from '@/components/Icon';
import { combineDateTime, fetchVenue } from '@/lib/api';
import { countryCodeFor } from '@/lib/countryCodes';
import { fmtDateLong, fmtTime, relativeDayBucket, type RelativeDayBucket } from '@/lib/format';
import { jsonLdScript, performerItemListJsonLd } from '@/lib/jsonld';
import { hreflangAlternates, localePath, ogAlternateLocales, ogLocale } from '@/lib/hreflang';
import { eventHref, parseIdFromSlugParam, performerHref, venueHref } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';
import type { ApiVenueResponse } from '@/lib/types';

// Backend data only changes via a once-daily sync job, so a long ISR window
// avoids re-invoking a function + hitting the backend on every crawl/visit.
export const revalidate = 1800;

/** Shared by the page and generateMetadata; Next.js dedupes the identical fetch(). */
async function loadVenue(slug: string): Promise<{ id: string; data: ApiVenueResponse }> {
  const id = parseIdFromSlugParam(slug);
  if (!id) notFound();
  const data = await fetchVenue(id, revalidate).catch(() => null);
  if (!data) notFound();

  const canonical = venueHref(id, data.venue.name);
  if (`/venue/${slug}` !== canonical) permanentRedirect(canonical);

  return { id, data };
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const { id, data } = await loadVenue(params.slug);
  const name = data.venue.name || 'Venue';
  const title = `${name} tickets — all upcoming events`;
  const description = `${data.events.length} upcoming event${data.events.length === 1 ? '' : 's'} at ${name}. Verified tickets, every seat guaranteed.`;
  const path = venueHref(id, name);
  const canonical = localePath(path, params.locale);

  return {
    title,
    description,
    alternates: { canonical, languages: hreflangAlternates(path) },
    openGraph: {
      title: `${title} | neop`,
      description,
      url: canonical,
      locale: ogLocale(params.locale),
      alternateLocale: ogAlternateLocales(params.locale),
    },
    twitter: { card: 'summary_large_image', title: `${title} | neop`, description },
  };
}

/** Background tint for the "how far out" pastille — nearer dates stand out more. */
function pastilleStyle(bucket: RelativeDayBucket | { year: number }): { background: string; color: string } {
  if (bucket === 'today' || bucket === 'tomorrow') {
    return { background: 'var(--grad)', color: 'var(--accent-ink)' };
  }
  return { background: 'var(--surface-2)', color: 'var(--dim)' };
}

export default async function VenuePage({ params }: { params: { locale: string; slug: string } }) {
  const { data } = await loadVenue(params.slug);
  const { venue, events } = data;
  const t = await getTranslations({ locale: params.locale, namespace: 'Venue' });
  const tDate = await getTranslations({ locale: params.locale, namespace: 'DateLabels' });
  const name = venue.name || t('venue');
  const location = [venue.city, venue.country].filter(Boolean).join(', ');
  const countryCode = countryCodeFor(venue.country);

  const itemList = performerItemListJsonLd(
    name,
    events.map((e) => ({
      url: `${SITE_URL}${eventHref({ id: e.id, title: e.name ?? '', artist: e.performer1 || e.name || name, city: e.city ?? '' })}`,
      name: e.name ?? name,
    })),
    params.locale,
  );

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '48px 28px 100px' }}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemList) }}
      />
      <div style={{ fontSize: 13.5, color: 'var(--faint)', marginBottom: 24 }}>
        <Link href="/" style={{ color: 'var(--dim)' }}>
          {t('home')}
        </Link>{' '}
        / {name}
      </div>

      <div style={{ marginBottom: 48 }}>
        <div
          style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 8 }}
        >
          {t('venue')}
        </div>
        <h1 className="serif" style={{ fontSize: 'clamp(32px,5vw,52px)', margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>
          {name}
        </h1>
        {location && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dim)', marginTop: 12, fontSize: 15 }}>
            <Icon name="pin" size={16} />
            {countryCode && <CountryFlag code={countryCode} width={18} />}
            {location}
          </p>
        )}
        <p style={{ color: 'var(--dim)', marginTop: 6, fontSize: 15 }}>
          {t('upcomingEvents', { count: events.length })}
        </p>
      </div>

      {events.length === 0 ? (
        <p style={{ color: 'var(--dim)', fontSize: 15 }}>{t('noUpcomingShows')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {events.map((e) => {
            const dt = combineDateTime(e.event_date, e.event_time);
            const bucket = relativeDayBucket(dt);
            const when = typeof bucket === 'string' ? tDate(bucket) : String(bucket.year);
            const whenStyle = pastilleStyle(bucket);
            const eventCountryCode = countryCodeFor(e.country);
            const artist = e.performer1 || e.name || name;
            const href = e.performer1_id ? performerHref(e.performer1_id, e.performer1) : eventHref({ id: e.id, title: e.name ?? '', artist, city: e.city ?? '' });
            return (
              <Link
                key={e.id}
                href={href}
                className="focus-ring performer-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 20,
                  padding: '20px 22px',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 17, fontWeight: 600 }}>{e.name || artist}</span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '4px 10px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        ...whenStyle,
                      }}
                    >
                      {when}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8, color: 'var(--dim)', fontSize: 14.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Icon name="cal" size={15} /> {fmtDateLong(dt, params.locale)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Icon name="clock" size={15} /> {fmtTime(dt, params.locale)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Icon name="user" size={15} /> {artist}
                    </span>
                    {e.country && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {eventCountryCode && <CountryFlag code={eventCountryCode} width={16} />}
                        {e.country}
                      </span>
                    )}
                  </div>
                </div>
                {/* Decorative — the whole card is the click target (same destination). */}
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '13px 22px',
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: 999,
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    background: 'var(--grad)',
                    color: 'var(--accent-ink)',
                  }}
                >
                  {t('tickets')}
                  <Icon name="arrow" size={17} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
