import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

// Open Graph wants a `language_TERRITORY` locale tag, not a bare language code.
const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  es: 'es_ES',
  de: 'de_DE',
  he: 'he_IL',
};

export function ogLocale(locale: string): string {
  return OG_LOCALE[locale] ?? locale;
}

export function ogAlternateLocales(locale: string): string[] {
  return routing.locales.filter((l) => l !== locale).map(ogLocale);
}

/**
 * Prefixes `path` (e.g. "/event/foo-123") with `locale`, mirroring the app's
 * `localePrefix: 'as-needed'` routing — the default locale stays unprefixed.
 */
export function localePath(path: string, locale: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

/**
 * hreflang alternates for `path` across every supported locale (plus
 * x-default), as paths relative to metadataBase — for `Metadata.alternates.languages`.
 */
export function hreflangAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = localePath(path, locale);
  }
  languages['x-default'] = path;
  return languages;
}

/**
 * Same as {@link hreflangAlternates}, but with absolute SITE_URL-prefixed
 * values — for contexts with no metadataBase to resolve against (sitemap.ts).
 */
export function hreflangAlternatesAbsolute(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${SITE_URL}${localePath(path, locale)}`;
  }
  languages['x-default'] = `${SITE_URL}${path}`;
  return languages;
}
