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
- **Coverage so far (Phase 1)**: `Nav`, `Footer`, `Hero`, the home page, and the
  `LanguageCurrencySelect` modal are fully translated in all 5 locales. Everything else (browse,
  event/performer/venue detail, checkout, confirmation, category labels, `lib/format.ts`'s
  date/relative-day strings) still renders in English regardless of locale prefix — translating
  those is later-phase work, not a bug.
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
