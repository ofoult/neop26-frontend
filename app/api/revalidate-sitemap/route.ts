import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * On-demand trigger for the static sitemap/robots routes (see app/sitemap.ts,
 * app/robots.ts). Called by the backend's daily sync job (backend/src/sync/run.ts)
 * once new data has landed in Postgres, so the sitemap only regenerates when
 * there's actually something new — never on a runtime timer that could
 * coincide with the backend being asleep.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('sitemap');
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
