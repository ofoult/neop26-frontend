import { routing } from '@/i18n/routing';
import { isoCurrencyFor } from './format';
import { SITE_URL } from './site';
import type { ApiListingCategory, CategoryId, NeopEvent } from './types';

// Maps neop's editorial categories onto the closest schema.org Event subtype,
// which is what Google's event rich-result / event indexing looks for.
const SCHEMA_TYPE_BY_CATEGORY: Record<CategoryId, string> = {
  music: 'MusicEvent',
  festivals: 'Festival',
  sports: 'SportsEvent',
  arts: 'TheaterEvent',
  comedy: 'ComedyEvent',
};

/**
 * Builds the `offers` node for an event: an AggregateOffer across ticket
 * categories when the (already-fetched, for the ticket picker) listings data
 * is available and has more than one category, a single Offer from either
 * one category or the event's own lowest-price field otherwise, or undefined
 * when no price is known at all. Omitting the whole node rather than
 * emitting an Offer with no price is deliberate — Google's Rich Results Test
 * flags a priceless Offer as a missing-required-field error, which is worse
 * than having no offers markup at all.
 */
function buildOffers(
  ev: NeopEvent,
  canonicalUrl: string,
  categories: ApiListingCategory[] | undefined,
): Record<string, unknown> | undefined {
  const priced = (categories ?? []).filter(
    (c) => Number.isFinite(c.fromPrice) && Number.isFinite(c.maxPrice),
  );
  const url = ev.url || canonicalUrl;

  if (priced.length > 1) {
    return {
      '@type': 'AggregateOffer',
      url,
      priceCurrency: priced.find((c) => c.currency)?.currency ?? isoCurrencyFor(ev.country),
      lowPrice: Math.min(...priced.map((c) => c.fromPrice)),
      highPrice: Math.max(...priced.map((c) => c.maxPrice)),
      offerCount: priced.length,
      availability: 'https://schema.org/InStock',
    };
  }

  if (priced.length === 1) {
    const [cat] = priced;
    return {
      '@type': 'Offer',
      url,
      price: cat.fromPrice,
      priceCurrency: cat.currency ?? isoCurrencyFor(ev.country),
      availability: 'https://schema.org/InStock',
      validFrom: ev.createdAt ?? undefined,
    };
  }

  if (ev.priceFrom != null) {
    return {
      '@type': 'Offer',
      url,
      price: ev.priceFrom,
      priceCurrency: isoCurrencyFor(ev.country),
      availability: 'https://schema.org/InStock',
      // No real on-sale date exists in the Gigsberg feed; the sync
      // timestamp is the closest honest proxy for "valid since".
      validFrom: ev.createdAt ?? undefined,
    };
  }

  return undefined;
}

/**
 * Builds schema.org Event JSON-LD for one event detail page. `categories`
 * (the per-ticket-type pricing that also feeds the ticket picker UI) is
 * optional so this can still be called before that (Suspense-streamed) data
 * has resolved — offers then just falls back to `ev.priceFrom`.
 */
export function eventJsonLd(
  ev: NeopEvent,
  canonicalUrl: string,
  locale: string,
  categories?: ApiListingCategory[],
): Record<string, unknown> {
  const offers = buildOffers(ev, canonicalUrl, categories);

  return {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE_BY_CATEGORY[ev.category] ?? 'Event',
    name: ev.title,
    startDate: ev.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: canonicalUrl,
    inLanguage: locale,
    image: ev.image ? [ev.image] : undefined,
    description: ev.blurb,
    location: {
      '@type': 'Place',
      name: ev.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: ev.city || undefined,
        addressCountry: ev.country || undefined,
      },
    },
    performer: ev.lineup.length
      ? ev.lineup.map((name) => ({ '@type': 'PerformingGroup', name }))
      : { '@type': 'PerformingGroup', name: ev.artist },
    // No real promoter/organizer data exists in the Gigsberg feed; neop is
    // the entity actually presenting the offer, so it stands in here.
    organizer: {
      '@type': 'Organization',
      name: 'neop',
      url: SITE_URL,
    },
    offers,
  };
}

// English display names for every locale neop.events supports, for
// ContactPoint.availableLanguage — derived from routing.ts's locale list
// (rather than hardcoded) so it can't drift out of sync as locales are added.
const LANGUAGE_DISPLAY_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });
const SUPPORTED_LANGUAGES = routing.locales.map((locale) => LANGUAGE_DISPLAY_NAMES.of(locale) ?? locale);

/** Builds schema.org Organization JSON-LD identifying neop as a brand entity. */
export function organizationJsonLd(description: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'neop',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description,
    // No official social profiles exist yet — omitted rather than filled
    // with invented URLs; add a `sameAs` array here once they do.
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@neop.events',
      contactType: 'customer service',
      availableLanguage: SUPPORTED_LANGUAGES,
    },
  };
}

/**
 * Builds a schema.org BreadcrumbList from an ordered list of crumbs. Per
 * Google's guidelines, `url` is optional on the last entry since it
 * represents the current page.
 */
export function breadcrumbJsonLd(items: { name: string; url?: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Builds a schema.org ItemList JSON-LD for a performer's upcoming events. */
export function performerItemListJsonLd(
  performerName: string,
  events: { url: string; name: string }[],
  locale: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${performerName} — upcoming events`,
    inLanguage: locale,
    itemListElement: events.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: e.url,
      name: e.name,
    })),
  };
}

/**
 * Serializes JSON-LD for a <script> tag, escaping "<" so a field value can
 * never break out of the script element (e.g. a title containing "</script>").
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
