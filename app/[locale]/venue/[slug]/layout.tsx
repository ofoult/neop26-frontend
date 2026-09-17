import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { parseIdFromSlugParam } from '@/lib/slug';

// Rejects slugs that carry no id before the route starts streaming — the same
// guard as event/[slug]/layout.tsx, for the same reason: this segment has a
// loading.tsx, so page.tsx's own notFound() fires after the response is
// already committed to 200. See that file for the full rationale.
export default function VenueSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  if (!parseIdFromSlugParam(params.slug)) notFound();
  return children;
}
