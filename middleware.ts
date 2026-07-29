import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Search-engine crawlers we want indexing the site. Everything else that
// identifies itself as a bot gets blocked below — generic scrapers, AI
// training/answer crawlers, and social-preview bots were burning through
// Vercel's usage credits with no SEO value in return.
const ALLOWED_BOTS = /googlebot|google-inspectiontool|bingbot|duckduckbot|applebot|yandex(bot)?/i;

// Heuristic match for "this looks like a bot, not a browser" — catches
// self-identifying crawlers plus common HTTP-client/headless-browser tools.
const BOT_SIGNATURE =
  /bot|spider|crawl|slurp|scraper|wget|curl\/|python-requests|scrapy|headlesschrome|phantomjs|node-fetch|go-http-client|okhttp|axios\//i;

export default function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';
  if (BOT_SIGNATURE.test(userAgent) && !ALLOWED_BOTS.test(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
