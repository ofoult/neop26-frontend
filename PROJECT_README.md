# neop — frontend

A Next.js 14 (App Router) + React + TypeScript + Tailwind recreation of the
**neop** event-ticketing design, wired to the real neop backend API
(`../backend`).

The original design reference (`README.md`, `neop.html`, `neop/*.jsx`,
`tweaks-panel.jsx`) is kept in this folder for reference and is not part of the
build.

## Running

The frontend talks to the backend, so start that first:

```bash
# in ../backend
npm run dev        # serves the API on http://localhost:3001
```

Then (this app uses **pnpm**):

```bash
# in this folder
pnpm install
pnpm dev           # http://localhost:3000
```

### API base URL

The client defaults to `http://localhost:3001`. To point at another backend,
set `NEXT_PUBLIC_API_BASE_URL` in the environment (no secrets belong here):

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com pnpm dev
```

## Routes (match the design spec)

| Route             | Screen        | Rendering                                   |
| ----------------- | ------------- | ------------------------------------------- |
| `/`               | Home          | Static (ISR, `revalidate` 120s)             |
| `/browse`         | Browse        | Server-rendered; `?cat=` → backend `type_id`|
| `/event/[id]`     | Event detail  | Server-rendered on demand                   |
| `/checkout`       | Checkout      | Client; order via `?event&tier&qty`         |
| `/confirmation`   | Confirmation  | Client; `?event&tier&qty&code` (chrome hidden) |

## How the data layer maps Gigsberg → neop

The backend exposes Gigsberg listings (`GET /events`, `GET /events/:id`). The
adapter in [`lib/api.ts`](lib/api.ts) maps each record onto the UI's `NeopEvent`
model:

- **Category** ← Gigsberg `type_id` (1 Sport, 2 Concert, 3 Comedy, 4 Festival,
  5 Theatre), mapped to neop's editorial categories in
  [`lib/categories.ts`](lib/categories.ts).
- **Artist / lineup** ← `performer1` / `performer2`.
- **Currency** ← inferred from the event `country` (the feed carries no currency
  code); see [`lib/format.ts`](lib/format.ts).
- **Date** ← `event_date` + `event_time` combined as a naive local datetime so
  displayed times match the listing.
- **"Trending"** ← events that have a known `min_price` (priced inventory is what
  neop can promote/sell). The feed has no popularity signal.
- **Price / tickets** ← `min_price`. Many Gigsberg events have no price; those
  show a "Get tickets" link to the partner listing (`url`, carrying the neop
  affiliate tag) instead of the demo checkout. Priced events get the full
  three-tier picker → checkout → confirmation flow.
- **Blurb** ← generated from the event fields (the feed has no description).

Ticket tiers (GA / Premium / VIP) and the 12% service fee are derived in
[`lib/tickets.ts`](lib/tickets.ts), mirroring the design reference.

## Notes / follow-ups

- **Search & full-text**: the search bar navigates to Browse. The backend's
  `/events` endpoint filters by `city`/`country`/`type_id` only — there is no
  text-search endpoint yet (it was planned in the project recap). Wire the bar
  to a real search endpoint when one exists.
- **Browse sort** (Trending / Price / Date) sorts the fetched page client-side;
  the result count reflects the real catalogue total. Server-side sort +
  pagination would be the next step for the full 28k-event catalogue.
- **Next.js version**: pinned to the latest patched **14.2.x**. `npm audit`
  proposes a major bump to Next 16; that's a breaking change (Next 15+ makes
  `params`/`searchParams` async) and should be evaluated deliberately before a
  production deploy.
