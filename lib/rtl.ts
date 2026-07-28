// Locales that render right-to-left. A short explicit list rather than
// deriving direction from Intl, since script-direction data isn't reliably
// queryable at runtime and this app only ever adds one RTL locale at a time.
const RTL_LOCALES = new Set(['he']);

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}
