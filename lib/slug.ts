// SEO-friendly "<keywords>-<id>" URL slugs for events and performers. The id
// suffix is the only part that matters for lookup — the keyword prefix is
// cosmetic, so a stale/mismatched prefix (e.g. an old link, or a renamed
// event) is fixed by redirecting to the freshly-computed canonical slug
// rather than by treating it as an error. See parseIdFromSlugParam.

const MAX_SLUG_WORDS_LEN = 80;

/** Lowercase, ASCII, hyphen-separated text safe for a URL path segment. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_WORDS_LEN)
    .replace(/-+$/g, '');
}

type SlugEvent = { id: string | number; title: string; artist: string; city: string };

export function buildEventSlug(ev: SlugEvent): string {
  const words = slugify(`${ev.artist} ${ev.title} ${ev.city}`) || 'event';
  return `${words}-${ev.id}`;
}

export function buildPerformerSlug(name: string | null | undefined, id: string | number): string {
  const words = slugify(name || 'artist') || 'artist';
  return `${words}-${id}`;
}

export function buildVenueSlug(name: string | null | undefined, id: string | number): string {
  const words = slugify(name || 'venue') || 'venue';
  return `${words}-${id}`;
}

export function eventHref(ev: SlugEvent): string {
  return `/event/${buildEventSlug(ev)}`;
}

export function performerHref(id: string | number, name?: string | null): string {
  return `/performer/${buildPerformerSlug(name, id)}`;
}

export function venueHref(id: string | number, name?: string | null): string {
  return `/venue/${buildVenueSlug(name, id)}`;
}

/**
 * Extracts the numeric id from a route param that's either "<slug>-<id>" or
 * a bare legacy "<id>". Returns null if no id is found (-> notFound()).
 */
export function parseIdFromSlugParam(param: string): string | null {
  const m = param.match(/(?:^|-)(\d+)$/);
  return m ? m[1] : null;
}
