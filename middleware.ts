import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { parseSitemapFilename } from './lib/sitemap';

const intlMiddleware = createMiddleware(routing);

// Sitemap requests (/sitemap.xml, /sitemap-static.xml, and every
// /sitemap-{type}-{lang}-{chunk}.xml chunk — see lib/sitemap.ts for the
// filename scheme) need to bypass locale detection entirely and resolve to
// the hand-rolled XML route handlers under app/api/sitemap/ instead of
// falling through to next-intl. NextResponse.rewrite keeps the pretty URL
// visible to crawlers; only the internal resolution changes. These paths
// contain a dot, so they're otherwise excluded by this file's own matcher
// below (the same exclusion that keeps middleware off every other static
// asset) — the extra matcher entries opt them back in.
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/sitemap.xml') {
    return NextResponse.rewrite(new URL('/api/sitemap/index', request.url));
  }
  if (pathname === '/sitemap-static.xml') {
    return NextResponse.rewrite(new URL('/api/sitemap/static', request.url));
  }
  const chunkRef = parseSitemapFilename(pathname.slice(1));
  if (chunkRef) {
    return NextResponse.rewrite(
      new URL(`/api/sitemap/${chunkRef.type}/${chunkRef.lang}/${chunkRef.chunkOneBased}`, request.url),
    );
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/sitemap.xml', '/sitemap-(.*)'],
};
