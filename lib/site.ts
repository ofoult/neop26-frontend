/** Canonical production origin — used for metadataBase, canonical URLs, JSON-LD, and the sitemap. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://neop.events').replace(/\/$/, '');
