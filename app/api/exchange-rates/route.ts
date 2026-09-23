import { NextResponse } from 'next/server';
import { CURRENCY_CODES } from '@/lib/languageCurrency';

/**
 * Indicative exchange rates for the currency switcher (see lib/currency.tsx).
 * Proxies Frankfurter v2 (ECB-sourced, free, no key) so the browser only talks
 * to us — no CORS — and every visitor shares one upstream call per hour via the
 * fetch cache. Rates are returned against USD; the client cross-converts any
 * pair as `amount * rates[to] / rates[from]`.
 */
const REVALIDATE_SECONDS = 3600;
const UPSTREAM = 'https://api.frankfurter.dev/v2/rates';

interface FrankfurterRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export async function GET(): Promise<NextResponse> {
  try {
    const url = `${UPSTREAM}?base=USD&quotes=${CURRENCY_CODES.filter((c) => c !== 'USD').join(',')}`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
    const rows = (await res.json()) as FrankfurterRate[];

    const rates: Record<string, number> = { USD: 1 };
    for (const row of rows) rates[row.quote] = row.rate;
    if (CURRENCY_CODES.some((c) => !(c in rates))) throw new Error('Incomplete rate set');

    return NextResponse.json(
      { base: 'USD', date: rows[0]?.date ?? null, rates, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=86400` } },
    );
  } catch (err) {
    console.error('[exchange-rates] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Exchange rates unavailable' }, { status: 502 });
  }
}
