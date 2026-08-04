# neop-frontend

Frontend for browsing/booking Gigsberg events (browse, event detail, checkout, confirmation).

## Stack

- **Framework**: [Next.js](https://nextjs.org/) 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Package manager**: pnpm

### Scripts (`package.json`)

- `pnpm dev` — `next dev -p 3000`
- `pnpm build` — `next build`
- `pnpm start` — `next start -p 3000`
- `pnpm lint` — `next lint`

### Layout (`app/` — App Router)

- `app/[locale]/page.tsx` — home
- `app/[locale]/browse/` — event browsing (`page.tsx`, `actions.ts`)
- `app/[locale]/event/[id]/` — event detail
- `app/[locale]/checkout/` — checkout flow
- `app/[locale]/confirmation/` — post-checkout confirmation
- `app/[locale]/not-found.tsx` — 404
- `app/[locale]/layout.tsx` — root layout (fonts, `<html lang dir>`, `NextIntlClientProvider`)
- `app/actions.ts` — shared server actions (stays at the true `app/` root — not a routed page)
- `app/sitemap.ts` / `app/robots.ts` — static (cached indefinitely), regenerated on-demand via
  `app/api/revalidate-sitemap/route.ts` rather than a runtime timer — see "Sitemap" below. Also
  stay at the `app/` root: they emit unprefixed (English) URLs, unaffected by locale routing.
- `next.config.mjs` — remote image patterns for Gigsberg + Unsplash artwork; wrapped with
  `next-intl`'s plugin (see "Internationalization" below).

## UX principles

- **Every user action must feel instant.** A click, navigation, or interaction always gets an
  immediate visual response — never a frozen screen while waiting on the network.
- **Every server call needs a visible indicator.** No fetch/mutation is allowed to run silently
  in the background with no UI feedback. Use whichever fits the case: a skeleton (see
  `components/Skeleton.tsx` and `app/event/[id]/loading.tsx` for the pattern), a loading spinner,
  a disabled/pending button state, an optimistic update, etc. — but something must always show
  the user their interaction is being handled.
- For pages with slow data (e.g. the event detail page's Gigsberg listings/seating-plan
  fetches), prefer streaming the slow parts in via React `Suspense` with a skeleton fallback
  rather than blocking the whole page behind one `await`.

## Internationalization

- **Library**: [`next-intl`](https://next-intl.dev). Config lives in `i18n/routing.ts` (locale
  list + default locale), `i18n/navigation.ts` (locale-aware `Link`/`useRouter`/`usePathname`,
  re-exported from `@/i18n/navigation` — use these instead of `next/link`/`next/navigation` in
  any component that renders on a translated page), and `i18n/request.ts` (loads
  `messages/${locale}.json`). `middleware.ts` handles locale detection/routing.
- **Locales**: `en` (default), `fr`, `es`, `de`, `he`, `it`, `nl`, `sv`, `ru`, `ar`, `hu`, `pl`,
  `hr`, `pt` — 14 total (`i18n/routing.ts`). `he` and `ar` are RTL (`lib/rtl.ts`'s
  `isRtlLocale`/`RTL_LOCALES`). `localePrefix: 'as-needed'` — English stays unprefixed at today's
  URLs (`/`, `/browse`, …); every other locale gets its own prefix (`/fr`, `/es`, `/de`, `/he`,
  `/it`, `/nl`, `/sv`, `/ru`, `/ar`, `/hu`, `/pl`, `/hr`, `/pt`). `app/[locale]/layout.tsx` sets
  `dir="rtl"` via `isRtlLocale(locale)`.
- **Coverage**: essentially the whole app is translated in all 14 locales — home, `Nav`, `Footer`,
  `Hero`, `LanguageCurrencySelect`, browse (`BrowseClient`, `SearchBar`, `TicketFilters`), event
  detail, performer detail, venue detail, checkout, confirmation, `not-found`, `EventCard`,
  `TicketPicker`, `TicketsAndSeatingPlan`, `SeatingPlanSvg`, and `PerformerTabs` all use
  `useTranslations`/`getTranslations` against dedicated namespaces in `messages/${locale}.json`
  (200 keys, in sync across all 14 locale files — verified by diffing each locale's flattened key
  set against `en.json`). Category labels render via `t('Categories')` everywhere
  (`lib/categories.ts`'s own hardcoded `label` field is dead data, unused for display).
  `lib/format.ts`'s date functions (`fmtDate`, `fmtDateLong`, `fmtTime`) are locale-aware via
  `Intl.DateTimeFormat`, and the relative-day bucket (`relativeDayBucket()`) returns a
  locale-independent key rendered through the `DateLabels` namespace — `RELATIVE_DAY_LABELS_EN`
  and `relativeDayLabel()` in that same file are unused dead code, not a live English fallback.
  Most plural strings use only ICU's `one`/`other` categories (matching the simplification
  already established for `fr`/`he`), but the four locales with grammatically obligatory extra
  plural categories spell them all out: `ru`/`pl` use `one`/`few`/`many`/`other`, `hr` uses
  `one`/`few`/`other` (CLDR defines no separate `many` for Croatian), and `ar` uses the full
  `zero`/`one`/`two`/`few`/`many`/`other` set. Verified correct across the relevant CLDR boundary
  counts (2, 5, 11-14, 21-25, 100+ for `ru`/`pl`/`hr`; 0, 2, 3-10, 11-99, 100+ for `ar`) by
  actually formatting each plural message with `intl-messageformat` rather than just eyeballing
  the ICU source.
  <!-- Earlier note here ("Phase 1", browse/event/performer/venue/checkout/confirmation still
  English-only) was stale — verified 2026-07-30 by reading every route/component; that note
  described an earlier state that no longer matches the code. -->
  **Known remaining gaps** (small, not a phase boundary): `app/[locale]/event/[slug]/page.tsx`
  hardcodes the "Back" link text and the "Trending" badge (the latter has an unused
  `EventCard.trending` key sitting right there); `components/Hero.tsx`'s carousel dot
  `aria-label`, `components/ui.tsx`'s `Logo` `aria-label="neop home"`, and
  `components/Drawer.tsx`'s close-button `aria-label="Close"` are hardcoded English with no
  translation key; `components/TicketsAndSeatingPlan.tsx`'s seating-plan image `alt` text has a
  hardcoded "seating plan" suffix; `components/LanguageCurrencySelect.tsx`'s close button has no
  `aria-label` at all; and `app/[locale]/checkout/page.tsx` has hardcoded example placeholders
  (name/email/phone/card fields) plus `'Apple Pay'`/`'PayPal'` payment-method labels (arguably
  fine to leave as brand names, but not routed through `t()` either way).
- **Adding a new translated string**: add the English key to `messages/en.json` first, then add
  the same key with a real translation to `messages/fr.json`, `messages/es.json`,
  `messages/de.json`, `messages/he.json` before merging — never leave a locale file missing a key
  a sibling component already uses. Reference via `useTranslations()` (client) or
  `getTranslations()` (server), never a fresh hardcoded string in an already-translated component.
- **Non-Latin font fallback**: `--font-sans`/`--font-serif` (`next/font/google`) only load a Latin
  subset. `app/globals.css`'s `:lang(he)`/`:lang(ar)`/`:lang(ru)` rule overrides to a system-font
  stack so Hebrew, Arabic, and Russian text doesn't silently fall back to an arbitrary browser
  default. The other 10 locales (`it`, `nl`, `sv`, `hu`, `pl`, `hr`, `pt`, plus the original `fr`,
  `es`, `de`) render in Latin script and need no such override.
- **RTL scope**: only the components above have been checked/fixed for `dir="rtl"` layout (mostly
  physical→logical CSS property swaps, e.g. `insetInlineEnd` instead of `right`). The rest of the
  app uses inline styles with physical properties throughout and has not been audited for RTL —
  expect visual bugs in Hebrew outside the translated surface until a later phase's RTL pass.

## External links

- `Btn`'s `newTab` prop (`components/ui.tsx`) is used for links that leave the site — currently
  only the checkout buttons in `components/TicketPicker.tsx`, which link out to Gigsberg.
- These links use `rel="noopener"` but deliberately **omit `noreferrer`**: Gigsberg relies on the
  `Referer` header to attribute checkout traffic back to neop. `noopener` alone is enough to
  block the tabnabbing vector (new tab can't reach `window.opener`); don't add `noreferrer` back
  without checking with Gigsberg first.

## Sitemap

A real multi-file sitemap, hand-rolled as plain Route Handlers rather than Next's built-in
`MetadataRoute.Sitemap` convention — that convention only emits a flat `<urlset>` at a fixed
`/sitemap/[id].xml` path, with no way to produce a genuine `<sitemapindex>` or a custom filename,
both of which this design needs.

- **`/sitemap.xml`** (`app/api/sitemap/index/route.ts`) — a real `<sitemapindex>` listing
  `sitemap-static.xml` plus every per-type/per-language/per-chunk file below.
- **`/sitemap-static.xml`** (`app/api/sitemap/static/route.ts`) — the fixed/bounded set of pages
  (home, `/browse`, category and subcategory pages) across all 14 locales, combined into one file
  since there are only a few dozen such paths total.
- **`/sitemap-{performer|event|venue}-{lang}-{n}.xml`**
  (`app/api/sitemap/[type]/[lang]/[chunk]/route.ts`) — one chunk of one resource type in one
  language, e.g. `sitemap-performer-fr-3.xml`. English is `-en-` like every other locale (no
  special-cased unprefixed form), even though its actual page URLs stay unprefixed per
  `localePrefix: 'as-needed'`.

Custom filenames at the site root can't just be a dynamic route segment — `app/[locale]/...`
already owns that position, and Next.js rejects two differently-named dynamic segments at the same
level. `middleware.ts` resolves this by rewriting the pretty sitemap URLs to the routes above
(`NextResponse.rewrite`, so crawlers only ever see the pretty URL) before next-intl's own
middleware ever runs; its `config.matcher` explicitly opts these paths back in, since they'd
otherwise be excluded by the same "skip anything with a dot" rule that keeps middleware off static
assets. `lib/sitemap.ts` is the single source of truth for the filename scheme
(`sitemapFilename`/`parseSitemapFilename`) and chunk sizing — shared by the middleware parser, the
index route, the per-chunk route's own `generateStaticParams`, and
`app/api/revalidate-sitemap/route.ts`'s warm-up list, so none of them can drift out of sync with
each other.

Each `<url>` entry is just a `<loc>` (+ `<lastmod>` for events) — **no hreflang alternates**, unlike
an earlier version of this design. Every page already sets its own hreflang tags independently in
its own `<head>` (`lib/hreflang.ts`'s `hreflangAlternates`, used from every locale page's
`generateMetadata`), and Google treats sitemap-hreflang and HTML-head-hreflang as equivalent,
redundant signals, so dropping them from the sitemap loses no real SEO value. It does matter for
size: with alternates, one `<url>` entry carried a link for all 14 languages, so file size scaled
with the locale count — growing from 5 to 14 locales once pushed a chunk from ~7MB to ~24MB,
over Vercel's 19.07MB prerendered-response cap (`FALLBACK_BODY_TOO_LARGE`). Without them, entries
are tiny regardless of locale count, which is also why `lib/sitemap.ts`'s `CHUNK_SIZE` could grow
back up to 45,000 (just under the sitemap protocol's own 50,000 URL/file cap) instead of needing
another hand-tuned shrink every time a locale is added.

Every backend fetch in these routes uses `next: { revalidate: false, tags: ['sitemap'] }`, so
they're built once and served from the cache with no runtime call to the backend — neither a
visitor nor Googlebot can ever be affected by the backend being slow/asleep. They only regenerate
when `POST /api/revalidate-sitemap` calls `revalidateTag('sitemap')`, which
`backend/src/sync/run.ts` does automatically after each successful daily sync (see backend
`CLAUDE.md`). To force a refresh manually: `curl -X POST https://neop.events/api/revalidate-sitemap -H "x-revalidate-secret: $REVALIDATE_SECRET"`.
Unlike the old `generateSitemaps()`-based design (which 404d under `next dev` regardless of any
code change, a framework limitation), these are plain Route Handlers and work fine under
`next dev` too — confirmed by actually curling `/sitemap.xml` and a `/sitemap-performer-{lang}-1.xml`
chunk against a dev server, not just `pnpm build && pnpm start`.

## Environment variables

- `NEXT_PUBLIC_API_BASE_URL` — base URL of the neop-backend API (see `.env.local`)
- `REVALIDATE_SECRET` — shared secret required by `app/api/revalidate-sitemap`; must match the
  backend's `REVALIDATE_SECRET` (set in Vercel's project env vars, not `.env.local`, since only
  the deployed site needs to accept revalidation calls)

## Deployment

- **Hosting**: [Vercel](https://vercel.com) (`vercel.json` sets `framework: nextjs`).
- **Backend API**: consumes the neop-backend service hosted on Render via `NEXT_PUBLIC_API_BASE_URL`.
- **Database**: none directly — all data comes through the backend API, which is backed by
  [Supabase](https://supabase.com) Postgres.
- **Repository**: GitHub.
