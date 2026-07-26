import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { CountryFlag } from '@/components/Flag';
import { Icon } from '@/components/Icon';
import { Img } from '@/components/Img';
import { combineDateTime, fetchPerformerEvents } from '@/lib/api';
import { countryCodeFor } from '@/lib/countryCodes';
import { fmtDateLong, fmtTime, relativeDayLabel } from '@/lib/format';
import { jsonLdScript, performerItemListJsonLd } from '@/lib/jsonld';
import { eventHref, parseIdFromSlugParam, performerHref } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';
import type { ApiPerformerResponse } from '@/lib/types';

export const revalidate = 120;

/** Shared by the page and generateMetadata; Next.js dedupes the identical fetch(). */
async function loadPerformer(slug: string): Promise<{ id: string; data: ApiPerformerResponse }> {
  const id = parseIdFromSlugParam(slug);
  if (!id) notFound();
  const data = await fetchPerformerEvents(id, revalidate).catch(() => null);
  if (!data) notFound();

  const canonical = performerHref(id, data.performer.name);
  if (`/performer/${slug}` !== canonical) permanentRedirect(canonical);

  return { id, data };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { id, data } = await loadPerformer(params.slug);
  const name = data.performer.name || 'Artist';
  const title = `${name} tickets — all upcoming events`;
  const description = `${data.events.length} upcoming event${data.events.length === 1 ? '' : 's'} for ${name}. Verified tickets, every seat guaranteed.`;
  const canonical = performerHref(id, name);

  return {
    title,
    description,
    alternates: { canonical },
    // openGraph/twitter titles aren't run through the root layout's title
    // template, so they need the "| neop" suffix spelled out explicitly.
    openGraph: {
      title: `${title} | neop`,
      description,
      url: canonical,
      images: data.performer.image ? [{ url: data.performer.image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | neop`,
      description,
      images: data.performer.image ? [data.performer.image] : undefined,
    },
  };
}

/** Background tint for the "how far out" pastille — nearer dates stand out more. */
function pastilleStyle(label: string): { background: string; color: string } {
  if (label === 'Today' || label === 'Tomorrow') {
    return { background: 'var(--grad)', color: 'var(--accent-ink)' };
  }
  return { background: 'var(--surface-2)', color: 'var(--dim)' };
}

export default async function PerformerPage({ params }: { params: { slug: string } }) {
  const { data } = await loadPerformer(params.slug);
  const { performer, events } = data;
  const name = performer.name || 'Artist';

  const itemList = performerItemListJsonLd(
    name,
    events.map((e) => ({
      url: `${SITE_URL}${eventHref({ id: e.id, title: e.name ?? '', artist: name, city: e.city ?? '' })}`,
      name: e.name ?? name,
    })),
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
          Home
        </Link>{' '}
        / {name}
      </div>

      {/* One image for the performer, shared across every event below. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48 }}>
        <div style={{ width: 120, height: 120, borderRadius: 20, overflow: 'hidden', flexShrink: 0 }}>
          <Img src={performer.image} alt={name} style={{ width: '100%', height: '100%' }} />
        </div>
        <div>
          <div
            style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 8 }}
          >
            Artist
          </div>
          <h1 className="serif" style={{ fontSize: 'clamp(32px,5vw,52px)', margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>
            {name}
          </h1>
          <p style={{ color: 'var(--dim)', marginTop: 10, fontSize: 15 }}>
            {events.length} upcoming event{events.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <p style={{ color: 'var(--dim)', fontSize: 15 }}>No upcoming events for {name} yet — check back soon.</p>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {events.map((e) => {
          const dt = combineDateTime(e.event_date, e.event_time);
          const when = relativeDayLabel(dt);
          const whenStyle = pastilleStyle(when);
          const countryCode = countryCodeFor(e.country);
          return (
            <Link
              key={e.id}
              href={eventHref({ id: e.id, title: e.name ?? '', artist: name, city: e.city ?? '' })}
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
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{e.name}</span>
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
                    <Icon name="cal" size={15} /> {fmtDateLong(dt)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="clock" size={15} /> {fmtTime(dt)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="pin" size={15} /> {[e.venue, e.city].filter(Boolean).join(', ')}
                  </span>
                  {e.country && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {countryCode && <CountryFlag code={countryCode} width={16} />}
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
                Tickets
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
