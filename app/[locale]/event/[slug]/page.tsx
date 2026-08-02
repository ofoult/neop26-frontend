import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
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
import { eventJsonLd, jsonLdScript } from '@/lib/jsonld';
import { hreflangAlternates, localePath, ogAlternateLocales, ogLocale } from '@/lib/hreflang';
import { eventHref, parseIdFromSlugParam, performerHref } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';
import type { NeopEvent } from '@/lib/types';

export const revalidate = 120;

/** Shared by the page and generateMetadata; Next.js dedupes the identical fetch(). */
async function loadEvent(slug: string): Promise<NeopEvent> {
  const id = parseIdFromSlugParam(slug);
  if (!id) notFound();
  const ev = await fetchEvent(id, revalidate).catch(() => null);
  if (!ev) notFound();

  // Note: because this route has a loading.tsx, Next.js starts streaming the
  // loading fallback (200) before this async function resolves, so by the
  // time permanentRedirect() throws, the response is already committed to
  // 200 and Next downgrades it to a 0-delay <meta http-equiv="refresh">
  // instead of a real 308 — Google explicitly treats a 0-delay meta refresh
  // the same as a permanent redirect, so this still consolidates correctly
  // for crawling purposes even though the raw HTTP status isn't 3xx. Only
  // non-canonical URL variants (bare legacy ids, stale slug text) hit this
  // path — the sitemap and all internal links always use the canonical form.
  const canonical = eventHref(ev);
  if (`/event/${slug}` !== canonical) permanentRedirect(canonical);

  return ev;
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const ev = await loadEvent(params.slug);
  const t = await getTranslations({ locale: params.locale, namespace: 'Event' });
  const title = t('metaTitle', { title: ev.title, venue: ev.venue, city: ev.city });
  // ev.blurb already names the venue/city, so just append the date rather
  // than repeating "at venue, city" — keeps this under Google's ~155-160
  // char truncation point instead of padding it with duplicate info.
  // Note: ev.blurb itself comes from the Gigsberg feed and is English-only
  // regardless of locale — translating vendor content is out of scope here,
  // only the date suffix is locale-aware.
  const description = `${ev.blurb} ${fmtDateLong(ev.date, params.locale)}.`.slice(0, 160);
  const path = eventHref(ev);
  const canonical = localePath(path, params.locale);

  return {
    title,
    description,
    alternates: { canonical, languages: hreflangAlternates(path) },
    // openGraph/twitter titles aren't run through the root layout's title
    // template, so they need the "| neop" suffix spelled out explicitly.
    openGraph: {
      title: `${title} | neop`,
      description,
      url: canonical,
      images: ev.image ? [{ url: ev.image }] : undefined,
      type: 'website',
      locale: ogLocale(params.locale),
      alternateLocale: ogAlternateLocales(params.locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | neop`,
      description,
      images: ev.image ? [ev.image] : undefined,
    },
  };
}

export default async function EventPage({ params }: { params: { locale: string; slug: string } }) {
  // Only the core event record gates the first paint — everything else
  // (ticket categories, the seating-plan SVG, "more like this") streams in
  // afterward via its own Suspense boundary, so a slow Gigsberg listing/SVG
  // fetch no longer blocks the hero from appearing.
  const ev = await loadEvent(params.slug);

  const tCat = await getTranslations({ locale: params.locale, namespace: 'Categories' });
  const cat = categoryById(ev.category);
  const countryCode = countryCodeFor(ev.country);
  const canonicalUrl = `${SITE_URL}${eventHref(ev)}`;

  return (
    <div>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(eventJsonLd(ev, canonicalUrl, params.locale)) }}
      />
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
            href={ev.performerId ? performerHref(ev.performerId, ev.artist) : `/browse?cat=${ev.category}`}
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
              {cat && tCat(cat.id)} · {ev.genre}
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
              <Icon name="cal" size={19} /> {fmtDateLong(ev.date, params.locale)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name="clock" size={19} /> {fmtTime(ev.date, params.locale)}
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
          {/* Same copy as the meta description (page.tsx generateMetadata) —
              having it appear verbatim on the page, not just in <meta>,
              gives Google real on-page text to match against so it doesn't
              fall back to unrelated content further down the page. */}
          <p style={{ marginTop: 22, maxWidth: 640, color: 'rgba(255,255,255,.85)', fontSize: 16, lineHeight: 1.6 }}>
            {ev.blurb}
          </p>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '40px 28px 0' }}>
        {/* tickets (left) + seating plan (right) */}
        <Suspense fallback={<TicketsAndSeatingPlanSkeleton />}>
          <TicketsAndSeatingPlanData ev={ev} eventId={ev.id} />
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
  const t = await getTranslations('Event');

  return (
    <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '72px 28px 0' }}>
      <SecHead kicker={t('keepExploring')} title={t('moreLikeThis')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
        {more.map((e, i) => (
          <EventCard key={e.id} ev={e} i={i} />
        ))}
      </div>
    </section>
  );
}

async function MoreLikeThisSkeleton() {
  const t = await getTranslations('Event');
  return (
    <section style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '72px 28px 0' }}>
      <SecHead kicker={t('keepExploring')} title={t('moreLikeThis')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ aspectRatio: '4/5', borderRadius: 18 }} />
        ))}
      </div>
    </section>
  );
}
