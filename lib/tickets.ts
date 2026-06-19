// Ticket tiers are derived from an event's lowest known price, mirroring the
// design reference (`tiersFor`). General Admission anchors at the base price;
// Premium and VIP scale up. Only meaningful when a base price is known.

export interface Tier {
  id: 'ga' | 'prem' | 'vip';
  name: string;
  desc: string;
  price: number;
  left: string;
  hot?: boolean;
}

export function tiersFor(priceFrom: number): Tier[] {
  const b = priceFrom;
  return [
    { id: 'ga', name: 'General Admission', desc: 'Standing · general access', price: b, left: 'Plenty left' },
    { id: 'prem', name: 'Premium', desc: 'Reserved seating · great views', price: Math.round(b * 1.9), left: '42 left' },
    { id: 'vip', name: 'VIP Experience', desc: 'Front section · lounge · merch', price: Math.round(b * 3.4), left: 'Only 8 left', hot: true },
  ];
}

export function tierById(priceFrom: number, id: string): Tier | undefined {
  return tiersFor(priceFrom).find((t) => t.id === id);
}

export const SERVICE_FEE_RATE = 0.12;
