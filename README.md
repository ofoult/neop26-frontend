# Handoff: neop

## Overview
neop is a dark minimalist product for buying tickets to live events worldwide.

## About the Design Files
The files are design references created in HTML. Recreate them in your target codebase (React, Next.js, Vue). Next.js + React + Tailwind is a natural fit.

## Screens
### Home
Full-bleed hero, city marquee, category pills, trending grid, weekend grid, guarantee band, festivals, footer. Max width 1240px.
### Event Detail
Sticky ticket picker with 3 tiers; quantity stepper 1 to 8; live subtotal.

### Browse
Breadcrumb, serif title, compact search bar, category pills + sort segmented control (Trending / Price / Date), result count, 3-col grid.

### Checkout
Max width 1080px. Two columns: left numbered steps (1 Your details, 2 Payment with Card/Apple Pay/PayPal toggle); right sticky order summary, 12% service fee, total, Pay CTA.

### Confirmation
Centered max 560px. Gradient check badge, "You're going!" headline, ticket-stub card (photo header, dashed perforation, detail grid, order code + faux QR), CTAs. Nav and footer hidden.

## Interactions
Routing: state object { name, id?, cat?, order? } via go(route) in NeopCtx. Names home, browse, event, checkout, confirm. Real routes /, /browse, /event/[id], /checkout, /confirmation.
Entrance neopUp keyframe opacity 0 to 1, translateY 18px to 0, 0.7s, staggered i*60ms.

## State
route, tier, qty, cat, sort, email, name. Tweaks accent (palette pair) and direction (editorial or kinetic). Replace window.NEOP.EVENTS with your API.

## Design Tokens
Colors: --bg #07070b, --bg-2 #0d0d14, --text #f5f4f8.
Accent default Nebula #7c3aed to #ec4899 as linear-gradient(115deg).
Voltage #c4f000/#00d6e6, Ember #ff5b29/#ff2d78, Lagoon #19c8a0/#f5a623, Magma #ff006e/#8b00ff.
Typography: Schibsted Grotesk 400-900, Instrument Serif. Hero clamp(48-52px, 8-9vw, 104-128px).
Radius cards 16-22px. Shadow accent glow 0 6-12px 18-30px -8px var(--accent).

## Assets
Unsplash images.unsplash.com/photo-ID?w=1400&q=80&auto=format&fit=crop. Replace in production.
Icons inline SVG in Icon component. Logo CSS wordmark.

## Files
neop.html shell. neop/data.js catalog. neop/components.jsx shared. neop/screens.jsx Home Browse. neop/flow.jsx EventDetail Checkout Confirm. neop/app.jsx root. tweaks-panel.jsx omit in production.

