'use client';

// Display-currency preference for the whole app. The visitor's choice lives in
// localStorage (so it survives sessions — not a cookie, see i18n/routing.ts's
// `localeCookie: false`) and drives two mechanisms:
//   1. Prices Gigsberg can convert itself (an event's ticket categories) are
//      re-fetched in that currency — see components/TicketsAndSeatingPlan.tsx —
//      so they match its checkout exactly.
//   2. Everything else (event cards, hero: prices from our DB) is converted
//      here with indicative Frankfurter rates from /api/exchange-rates,
//      fetched when the currency changes and then refreshed every hour.
// The rates route always answers relative to USD; any pair is cross-converted.

import { useLocale } from 'next-intl';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { currencySymbol } from '@/lib/format';
import { CURRENCY_CODES } from '@/lib/languageCurrency';

const STORAGE_KEY = 'neop.currency';
const REFRESH_MS = 60 * 60 * 1000;

type RatesStatus = 'idle' | 'loading' | 'ready' | 'error';

interface CurrencyContextValue {
  /** ISO code of the chosen display currency, or null = keep each event's own currency. */
  currency: string | null;
  setCurrency: (code: string | null) => void;
  status: RatesStatus;
  /** When the current rates were last fetched successfully. */
  updatedAt: Date | null;
  /** Bumps every hour while a currency is active — hooks that re-fetch live data key off it. */
  tick: number;
  /** Cross-converts via the loaded rates, or null when no rate is available for the pair. */
  convert: (amount: number, from: string) => number | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStoredCurrency(): string | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && CURRENCY_CODES.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [status, setStatus] = useState<RatesStatus>('idle');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  // Read after mount (not in useState's initializer) so the server render and
  // first client render agree — prices then switch over once hydrated.
  useEffect(() => {
    setCurrencyState(readStoredCurrency());
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setCurrencyState(readStoredCurrency());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCurrency = useCallback((code: string | null) => {
    setCurrencyState(code);
    try {
      if (code) window.localStorage.setItem(STORAGE_KEY, code);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode, blocked): the choice just lasts this page view.
    }
  }, []);

  // Fetch the rates as soon as a currency is active (including on a currency
  // change), then every hour for as long as the session stays open.
  useEffect(() => {
    if (!currency) return;
    let controller: AbortController | null = null;

    async function load() {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      setStatus('loading');
      try {
        const res = await fetch('/api/exchange-rates', { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { rates: Record<string, number> };
        setRates(data.rates);
        setUpdatedAt(new Date());
        setStatus('ready');
      } catch (err) {
        if (signal.aborted) return;
        // Keep any previous rates: slightly stale beats none. `status` tells the UI.
        setStatus('error');
        console.error('[currency] rates unavailable:', err);
      }
    }

    load();
    const timer = setInterval(() => {
      load();
      setTick((t) => t + 1);
    }, REFRESH_MS);
    return () => {
      clearInterval(timer);
      controller?.abort();
    };
  }, [currency]);

  const convert = useCallback(
    (amount: number, from: string): number | null => {
      if (!currency || !rates) return null;
      const fromRate = rates[from];
      const toRate = rates[currency];
      if (!fromRate || !toRate) return null;
      return (amount * toRate) / fromRate;
    },
    [currency, rates],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, status, updatedAt, tick, convert }),
    [currency, setCurrency, status, updatedAt, tick, convert],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside <CurrencyProvider>');
  return ctx;
}

export interface FormattedPrice {
  text: string;
  /** True when `text` is an indicative conversion (rendered with a leading "≈"). */
  approximate: boolean;
  /** The untouched price in the source currency, for a tooltip on converted amounts. */
  original: string | null;
}

/**
 * Returns a formatter for `(amount, sourceIsoCode)`:
 *  - no currency chosen → the source price exactly as before (`€45`);
 *  - source already is the chosen currency (Gigsberg converted it) → exact price;
 *  - otherwise → "≈" + the rate-converted price, or the native price while rates
 *    aren't loaded (never a wrong number).
 */
export function usePriceFormatter(): (amount: number, from: string) => FormattedPrice {
  const locale = useLocale();
  const { currency, convert } = useCurrency();

  return useCallback(
    (amount: number, from: string): FormattedPrice => {
      const native = `${currencySymbol(from)}${amount}`;
      if (!currency) return { text: native, approximate: false, original: null };

      if (from === currency) {
        return { text: formatMoney(amount, currency, locale, 2), approximate: false, original: null };
      }
      const converted = convert(amount, from);
      if (converted === null) return { text: native, approximate: false, original: null };
      return {
        text: `≈ ${formatMoney(converted, currency, locale, 0)}`,
        approximate: true,
        original: native,
      };
    },
    [currency, convert, locale],
  );
}

/** String-only variant of {@link usePriceFormatter} for translated templates (`t('fromPrice', { price })`). */
export function useFormatPrice(): (amount: number, from: string) => string {
  const format = usePriceFormatter();
  return useCallback((amount, from) => format(amount, from).text, [format]);
}

function formatMoney(amount: number, currency: string, locale: string, maxFractionDigits: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // "179.6" reads as a typo: show whole amounts bare, fractional ones with all their digits.
    minimumFractionDigits: Number.isInteger(amount) ? 0 : maxFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(amount);
}

/** A price in the visitor's chosen currency; converted amounts get a tooltip with the original. */
export function Price({ amount, from }: { amount: number; from: string }) {
  const format = usePriceFormatter();
  const { text, approximate, original } = format(amount, from);
  return approximate ? <span title={original ?? undefined}>{text}</span> : <>{text}</>;
}
