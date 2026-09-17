import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { parseIdFromSlugParam } from '@/lib/slug';

// Rejects slugs that carry no id before the route starts streaming.
//
// page.tsx already calls notFound() for these, but by then it's too late to
// affect the status code: this segment has a loading.tsx, so Next.js flushes
// the loading shell — committing HTTP 200 — the moment it starts rendering
// the page, and a notFound() thrown afterwards can only swap the body. (Same
// commit-before-throw that downgrades the canonical permanentRedirect in
// page.tsx to a meta refresh; see the note there.) The result was a soft 404:
// /event/null and friends answering 200, which is why crawlers keep
// re-requesting them — Meta's alone asks for /event/null ~250x/day, a
// leftover from the pre-slug `/event/${ev.id}` links where a null id
// stringified straight into the href.
//
// A layout renders *above* its own segment's Suspense boundary, so this runs
// before any bytes are sent and notFound() here produces a real 404. It stays
// a pure regex check (no fetch) so it costs nothing on the happy path; an id
// that parses but doesn't exist is still page.tsx's call.
export default function EventSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  if (!parseIdFromSlugParam(params.slug)) notFound();
  return children;
}
