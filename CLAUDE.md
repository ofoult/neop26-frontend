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

## Environment variables

- `NEXT_PUBLIC_API_BASE_URL` — base URL of the neop-backend API (see `.env.local`)

## Deployment

- **Hosting**: [Vercel](https://vercel.com) (`vercel.json` sets `framework: nextjs`).
- **Backend API**: consumes the neop-backend service hosted on Render via `NEXT_PUBLIC_API_BASE_URL`.
- **Database**: none directly — all data comes through the backend API, which is backed by
  [Supabase](https://supabase.com) Postgres.
- **Repository**: GitHub.
