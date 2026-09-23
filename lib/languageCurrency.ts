// This file contains the list of supported languages and currencies for the application. as well as their respective codes, names, and symbols.

// `code` is the ISO 639-1 language/locale code (matches i18n/routing.ts's
// `locales`), while `flag` is the ISO 3166 country code passed straight
// through to flagcdn.com (components/Flag.tsx) — the two are intentionally
// different vocabularies (Hebrew's language code "he" has no matching flag;
// it displays Israel's "IL" flag).
export const LANGUAGES = [
  {
    code: "en",
    language: "English",
    region: "United States",
    flag: "US",
  },
  {
    code: "fr",
    language: "Français",
    region: "France",
    flag: "FR",
  },
  {
    code: "es",
    language: "Español",
    region: "España",
    flag: "ES",
  },
  {
    code: "de",
    language: "Deutsch",
    region: "Deutschland",
    flag: "DE",
  },
  {
    code: "he",
    language: "עברית",
    region: "ישראל",
    flag: "IL",
  },
  {
    code: "it",
    language: "Italiano",
    region: "Italia",
    flag: "IT",
  },
  {
    code: "nl",
    language: "Nederlands",
    region: "Nederland",
    flag: "NL",
  },
  {
    code: "sv",
    language: "Svenska",
    region: "Sverige",
    flag: "SE",
  },
  {
    code: "ru",
    language: "Русский",
    region: "Россия",
    flag: "RU",
  },
  {
    code: "ar",
    language: "العربية",
    region: "السعودية",
    flag: "SA",
  },
  {
    code: "hu",
    language: "Magyar",
    region: "Magyarország",
    flag: "HU",
  },
  {
    code: "pl",
    language: "Polski",
    region: "Polska",
    flag: "PL",
  },
  {
    code: "hr",
    language: "Hrvatski",
    region: "Hrvatska",
    flag: "HR",
  },
  {
    code: "pt",
    language: "Português",
    region: "Portugal",
    flag: "PT",
  },
];

// Display currencies the user can pick. Limited to what Gigsberg's listing search
// can convert to via `currency_code` (backend/src/gigsberg/listings.ts's
// LISTING_CURRENCIES — keep both lists in sync); every one is also available from
// the Frankfurter rates used for the prices Gigsberg doesn't convert (event cards).
export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "ARS", name: "Argentine Peso", symbol: "AR$" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
