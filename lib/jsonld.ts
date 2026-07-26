import { isoCurrencyFor } from './format';
import type { CategoryId, NeopEvent } from './types';

// Maps neop's editorial categories onto the closest schema.org Event subtype,
// which is what Google's event rich-result / event indexing looks for.
const SCHEMA_TYPE_BY_CATEGORY: Record<CategoryId, string> = {
  music: 'MusicEvent',
  festivals: 'Festival',
  sports: 'SportsEvent',
  arts: 'TheaterEvent',
  comedy: 'ComedyEvent',
};

/** Builds schema.org Event JSON-LD for one event detail page. */
export function eventJsonLd(ev: NeopEvent, canonicalUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE_BY_CATEGORY[ev.category] ?? 'Event',
    name: ev.title,
    startDate: ev.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: canonicalUrl,
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
    offers: {
      '@type': 'Offer',
      url: ev.url || canonicalUrl,
      price: ev.priceFrom ?? undefined,
      priceCurrency: isoCurrencyFor(ev.country),
      availability: 'https://schema.org/InStock',
    },
  };
}

/** Builds a schema.org ItemList JSON-LD for a performer's upcoming events. */
export function performerItemListJsonLd(
  performerName: string,
  events: { url: string; name: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${performerName} — upcoming events`,
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
