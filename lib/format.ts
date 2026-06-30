// Date / time / currency formatting — date helpers ported verbatim from the
// neop HTML reference so output matches the design exactly.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseDate(s: string): Date {
  return new Date(s);
}

export function fmtDate(s: string): string {
  const d = parseDate(s);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtDateLong(s: string): string {
  const d = parseDate(s);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtTime(s: string): string {
  const d = parseDate(s);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ap}`;
}

export function dayNum(s: string): number {
  return parseDate(s).getDate();
}

export function monStr(s: string): string {
  return MONTHS[parseDate(s).getMonth()].toUpperCase();
}

// ===== currency =====
// The Gigsberg feed carries no currency code, so we infer a display symbol from
// the event country. Defaults to "$".
const EURO_COUNTRIES = new Set([
  'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Austria', 'Belgium',
  'Portugal', 'Ireland', 'Greece', 'Finland', 'Croatia', 'Slovakia', 'Slovenia',
  'Estonia', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Cyprus',
]);

const SYMBOL_BY_COUNTRY: Record<string, string> = {
  'United Kingdom': '£',
  UK: '£',
  Switzerland: 'CHF ',
  Sweden: 'kr ',
  Norway: 'kr ',
  Denmark: 'kr ',
  Poland: 'zł ',
  'Czech Republic': 'Kč ',
  Japan: '¥',
  Israel: '₪',
};

export function currencyFor(country: string | null | undefined): string {
  if (!country) return '$';
  if (SYMBOL_BY_COUNTRY[country]) return SYMBOL_BY_COUNTRY[country];
  if (EURO_COUNTRIES.has(country)) return '€';
  return '$';
}

// Listings carry an ISO currency code (e.g. "USD", "EUR"), unlike the event
// feed. Map common codes to a display symbol, falling back to the code itself.
const SYMBOL_BY_CODE: Record<string, string> = {
  USD: '$', CAD: '$', AUD: '$', NZD: '$',
  EUR: '€', GBP: '£', JPY: '¥', ILS: '₪',
  CHF: 'CHF ', SEK: 'kr ', NOK: 'kr ', DKK: 'kr ', PLN: 'zł ', CZK: 'Kč ',
};

export function currencySymbol(code: string | null | undefined, fallback = '$'): string {
  if (!code) return fallback;
  return SYMBOL_BY_CODE[code.toUpperCase()] ?? `${code} `;
}

/** Formats a price with its currency symbol, or a graceful fallback when unknown. */
export function fmtPrice(currency: string, price: number | null): string {
  if (price == null) return 'Price on request';
  return `${currency}${price}`;
}
