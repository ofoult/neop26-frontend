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
- **Locales**: `en` (default), `fr`, `es`, `de`, `he` (RTL). `localePrefix: 'as-needed'` — English
  stays unprefixed at today's URLs (`/`, `/browse`, …); the other four get `/fr`, `/es`, `/de`,
  `/he`. `app/[locale]/layout.tsx` sets `dir="rtl"` only for `he`.
- **Coverage**: essentially the whole app is translated in all 5 locales — home, `Nav`, `Footer`,
  `Hero`, `LanguageCurrencySelect`, browse (`BrowseClient`, `SearchBar`, `TicketFilters`), event
  detail, performer detail, venue detail, checkout, confirmation, `not-found`, `EventCard`,
  `TicketPicker`, `TicketsAndSeatingPlan`, `SeatingPlanSvg`, and `PerformerTabs` all use
  `useTranslations`/`getTranslations` against dedicated namespaces in `messages/${locale}.json`
  (189 keys, in sync across all 5 locale files). Category labels render via `t('Categories')`
  everywhere (`lib/categories.ts`'s own hardcoded `label` field is dead data, unused for display).
  `lib/format.ts`'s date functions (`fmtDate`, `fmtDateLong`, `fmtTime`) are locale-aware via
  `Intl.DateTimeFormat`, and the relative-day bucket (`relativeDayBucket()`) returns a
  locale-independent key rendered through the `DateLabels` namespace — `RELATIVE_DAY_LABELS_EN`
  and `relativeDayLabel()` in that same file are unused dead code, not a live English fallback.
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
- **Hebrew font fallback**: `--font-sans`/`--font-serif` (`next/font/google`) only load a Latin
  subset. `app/globals.css`'s `:lang(he)` rule overrides to a system-font stack so Hebrew text
  doesn't silently fall back to an arbitrary browser default.
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

`app/sitemap.ts` and `app/robots.ts` are static: every backend fetch inside them uses
`next: { revalidate: false, tags: ['sitemap'] }`, so they're built once and served from the cache
with no runtime call to the backend — neither a visitor nor Googlebot can ever be affected by the
backend being slow/asleep (confirmed static/SSG in `next build` output). They only regenerate
when `POST /api/revalidate-sitemap` calls `revalidateTag('sitemap')`, which
`backend/src/sync/run.ts` does automatically after each successful daily sync (see backend
`CLAUDE.md`). To force a refresh manually: `curl -X POST https://neop.events/api/revalidate-sitemap -H "x-revalidate-secret: $REVALIDATE_SECRET"`.
Note: `next dev` 404s these sitemap routes regardless of this change (a pre-existing
`generateSitemaps()` + dev-server limitation) — always verify with `pnpm build && pnpm start`.

## SEO & Google indexing

**Indexing status: inconclusive from this review, not confirmed either way.** An attempt was made
(2026-07-31) to check `site:neop.events` and fetch `https://neop.events` directly to verify
indexing, but the tooling available in that review session proved unreliable for this: its
WebFetch tool returned HTTP 403 for `neop.events` but *also* for `vercel.com` and `example.com` in
the same session, proving it was broken/blocked at the tool level rather than reporting anything
real about neop.events, and its WebSearch tool failed to surface even the bare domain name for a
plain `neop.events` query — a tooling/ranking gap, not evidence of non-indexing. Per the site
owner, the site **is** indexed. Don't trust either of those data points from that session; if
indexing is ever in question again, verify directly in Google Search Console (Coverage report +
URL Inspection on `https://neop.events/`) rather than via a sandboxed agent's web-fetch tools.

The on-page SEO implementation itself (metadata, sitemap, hreflang, JSON-LD, described below) is
solid regardless of indexing status.

**Secondary, code-level SEO opportunities found in this review** (worth fixing regardless, but
none of them explain total non-indexing on their own):
- `app/[locale]/browse/page.tsx` has no `generateMetadata` at all — unlike `/`, `/event/[slug]`,
  `/performer/[slug]`, `/venue/[slug]`. It inherits the root layout's generic title/description
  and gets **no canonical tag**, even though it's the main catalogue entry point (priority 0.9 in
  the sitemap) and takes `?cat=`, `?q=`, `?page=` query params that can otherwise be crawled as
  distinct, uncanonicalized URLs.
- `components/EventCard.tsx` — used on the home page's grids, `/browse`, and the event page's
  "more like this" strip, i.e. nearly every listing surface — links to the **performer's** page
  (`performerHref`) instead of the event's own detail page whenever `ev.performerId` is set,
  which is true for the large majority of events. Individual event pages (the ones carrying the
  `Event` JSON-LD, price, date) end up reachable mainly via the sitemap and the performer page's
  own event list, rather than directly from any listing grid — worth confirming this internal-
  linking tradeoff is intentional.
- `components/Img.tsx` (the shared image component for every card thumbnail and the Hero image)
  renders a plain `<img>` with no `loading="lazy"` on below-the-fold thumbnails and no
  `fetchpriority="high"` on the Hero's LCP image — both are inputs to Core Web Vitals, which
  factors into Google ranking.
- `lib/jsonld.ts`'s `eventJsonLd` sets `startDate: ev.date`, where `ev.date` (from
  `combineDateTime` in `lib/api.ts`) is a naive local datetime with no UTC offset/timezone.
  Google's structured-data guidance recommends including a timezone on `startDate`.

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
