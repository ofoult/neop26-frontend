declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface GigsbergRedirect {
  eventName: string;
  /** Category (seat section) the tickets belong to, when known. */
  category?: string;
  /** Price per ticket, in `currency`. */
  price: number | null;
  /** Number of seats selected, when known. */
  quantity?: number;
  /** ISO 4217 code of `price`. */
  currency: string;
}

/**
 * Reports that the user is being sent to Gigsberg to buy tickets, as GA4's
 * recommended `begin_checkout` event (mark it as a key event in GA to count it
 * as a conversion). `value` is the order total (price × seats).
 */
export function trackGigsbergRedirect({ eventName, category, price, quantity, currency }: GigsbergRedirect) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const qty = quantity && quantity > 0 ? quantity : 1;
  const value = price != null ? Math.round(price * qty * 100) / 100 : undefined;
  window.gtag('event', 'begin_checkout', {
    currency,
    value,
    event_name: eventName,
    ticket_category: category,
    seats: quantity,
    destination: 'gigsberg',
    items: [
      {
        item_id: eventName,
        item_name: eventName,
        item_category: category,
        price: price ?? undefined,
        quantity: qty,
      },
    ],
  });
}
