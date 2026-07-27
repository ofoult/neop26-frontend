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

- `app/page.tsx` — home
- `app/browse/` — event browsing (`page.tsx`, `actions.ts`)
- `app/event/[id]/` — event detail
- `app/checkout/` — checkout flow
- `app/confirmation/` — post-checkout confirmation
- `app/actions.ts` — shared server actions
- `app/sitemap.ts` / `app/robots.ts` — static (cached indefinitely), regenerated on-demand via
  `app/api/revalidate-sitemap/route.ts` rather than a runtime timer — see "Sitemap" below.
- `next.config.mjs` — remote image patterns for Gigsberg + Unsplash artwork

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
