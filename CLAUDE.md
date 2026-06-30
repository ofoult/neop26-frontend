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

## Environment variables

- `NEXT_PUBLIC_API_BASE_URL` — base URL of the neop-backend API (see `.env.local`)

## Deployment

- **Hosting**: [Vercel](https://vercel.com) (`vercel.json` sets `framework: nextjs`).
- **Backend API**: consumes the neop-backend service hosted on Render via `NEXT_PUBLIC_API_BASE_URL`.
- **Database**: none directly — all data comes through the backend API, which is backed by
  [Supabase](https://supabase.com) Postgres.
- **Repository**: GitHub.
