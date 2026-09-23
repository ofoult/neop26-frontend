import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense, type CSSProperties } from 'react';
import { CountryFlag } from '@/components/Flag';
import { Icon } from '@/components/Icon';
import { Img } from '@/components/Img';
import { Skeleton } from '@/components/Skeleton';
import { TicketsAndSeatingPlan } from '@/components/TicketsAndSeatingPlan';
import { fetchEvent, fetchEventListings, fetchEventSeatingPlan, fetchSeatingPlanSvgMarkup, fetchSubtypes } from '@/lib/api';
import { categoryById } from '@/lib/categories';
import { countryCodeFor } from '@/lib/countryCodes';
import { fmtDateLong, fmtTime } from '@/lib/format';
import { breadcrumbJsonLd, eventJsonLd, jsonLdScript } from '@/lib/jsonld';
import { hreflangAlternates, localePath, ogAlternateLocales, ogLocale } from '@/lib/hreflang';
import { eventHref, parseIdFromSlugParam, performerHref, slugify } from '@/lib/slug';
import { findSubcategory, toSubcategories } from '@/lib/subcategories';
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
  setRequestLocale(params.locale);
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
  setRequestLocale(params.locale);
  // Only the core event record gates the first paint — everything else
  // (ticket categories, the seating-plan SVG, "more like this") streams in
  // afterward via its own Suspense boundary, so a slow Gigsberg listing/SVG
  // fetch no longer blocks the hero from appearing.
  const ev = await loadEvent(params.slug);

  const tCat = await getTranslations({ locale: params.locale, namespace: 'Categories' });
  const cat = categoryById(ev.category);
  const countryCode = countryCodeFor(ev.country);
  const canonicalUrl = `${SITE_URL}${eventHref(ev)}`;
  const breadcrumb = breadcrumbJsonLd([
    { name: 'neop', url: `${SITE_URL}${localePath('/', params.locale)}` },
    ...(cat ? [{ name: tCat(cat.id), url: `${SITE_URL}${localePath(`/browse/${cat.id}`, params.locale)}` }] : []),
    { name: ev.title },
  ]);

  // Link the "Category · Genre" pill to the genre's subcategory page when it
  // resolves to one (same slug rules as /browse/[slug]); else the category.
  const subcat = findSubcategory(toSubcategories(await fetchSubtypes()), slugify(ev.genre));
  const categoryHref = `/browse/${subcat && subcat.categoryId === ev.category ? subcat.slug : ev.category}`;
  const pillStyle: CSSProperties = {
    padding: '6px 12px',
    borderRadius: 999,
    background: 'rgba(255,255,255,.12)',
    backdropFilter: 'blur(10px)',
    fontSize: 12.5,
    fontWeight: 600,
  };

  return (
    <div>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      {/* hero */}
      <div style={{ position: 'relative', marginTop: '-88px' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Img src={ev.image} alt={ev.title} priority style={{ width: '100%', height: '100%' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, var(--bg) 1%, rgba(7,7,11,.45) 45%, rgba(7,7,11,.6))',
            }}
          />
        </div>
        <div style={{ position: 'relative', maxWidth: 'var(--maxw)', margin: '0 auto', padding: '104px 28px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
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
            <Link href={categoryHref} className="focus-ring" style={pillStyle}>
              {cat && tCat(cat.id)} · {ev.genre}
            </Link>
            <Link
              href={ev.performerId ? performerHref(ev.performerId, ev.artist) : `/browse/${ev.category}`}
              className="focus-ring"
              style={pillStyle}
            >
              {ev.artist}
            </Link>
          </div>
          <h1 className="serif" style={{ fontSize: 'clamp(26px,3.6vw,44px)', margin: 0, lineHeight: 1.05, letterSpacing: '-0.01em' }}>
            {ev.title}
          </h1>
          <div
            style={{
              display: 'flex',
              gap: '6px 18px',
              marginTop: 10,
              flexWrap: 'wrap',
              color: 'rgba(255,255,255,.9)',
              fontSize: 13,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="cal" size={14} /> {fmtDateLong(ev.date, params.locale)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="clock" size={14} /> {fmtTime(ev.date, params.locale)}
            </span>
            <span className="event-meta-venue" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="pin" size={14} /> {ev.venue}, {ev.city}
            </span>
            {ev.country && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {countryCode && <CountryFlag code={countryCode} width={14} />}
                {/* Responsive: flag only (the name is hidden) to save room. */}
                <span className={countryCode ? 'event-meta-country-name' : undefined}>{ev.country}</span>
              </span>
            )}
          </div>
          {/* Same copy as the meta description (page.tsx generateMetadata) —
              having it appear verbatim on the page, not just in <meta>,
              gives Google real on-page text to match against so it doesn't
              fall back to unrelated content further down the page. */}
          <p style={{ margin: '8px 0 0', maxWidth: 640, color: 'rgba(255,255,255,.8)', fontSize: 13, lineHeight: 1.45 }}>
            {ev.blurb}
          </p>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '4px 28px 0' }}>
        {/* tickets (left) + seating plan (right) */}
        <Suspense fallback={<TicketsAndSeatingPlanSkeleton />}>
          <TicketsAndSeatingPlanData ev={ev} eventId={ev.id} canonicalUrl={canonicalUrl} locale={params.locale} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Fetches + renders the ticket picker and seating plan; streamed in via
 * Suspense above. Also emits the event's Offer/AggregateOffer JSON-LD here
 * (rather than synchronously in EventPage) since it's the same `categories`
 * fetch that feeds the ticket picker's own price display — reusing it keeps
 * the structured data in sync with what's on the page and avoids a second
 * blocking fetch just for SEO markup.
 */
async function TicketsAndSeatingPlanData({
  ev,
  eventId,
  canonicalUrl,
  locale,
}: {
  ev: NeopEvent;
  eventId: string;
  canonicalUrl: string;
  locale: string;
}) {
  const [categories, seatingPlan] = await Promise.all([
    fetchEventListings(eventId, revalidate),
    fetchEventSeatingPlan(eventId),
  ]);
  const svgMarkup = seatingPlan ? await fetchSeatingPlanSvgMarkup(seatingPlan.svgUrl) : null;
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(eventJsonLd(ev, canonicalUrl, locale, categories)) }}
      />
      <TicketsAndSeatingPlan ev={ev} categories={categories} seatingPlan={seatingPlan} svgMarkup={svgMarkup} />
    </>
  );
}

/** Roughly matches TicketsAndSeatingPlan's 400px + 1fr layout to minimize shift when it swaps in. */
function TicketsAndSeatingPlanSkeleton() {
  return (
    <div className="tickets-plan-grid has-plan">
      <div className="tickets-plan-tickets">
        <div style={{ borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--border)', padding: 22 }}>
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
      </div>
      <div className="tickets-plan-seatmap">
        <Skeleton style={{ height: 26, width: 170, marginBottom: 18 }} />
        <Skeleton style={{ height: 520, borderRadius: 18 }} />
      </div>
    </div>
  );
}
