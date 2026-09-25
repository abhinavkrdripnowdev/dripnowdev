import { Knex } from 'knex';
export function discountPaise(subtotal: number, offer: { offer_type: string; discount_value: number | string }): number {
  const value = Number(offer.discount_value);
  if (!Number.isFinite(value) || value < 0) return 0;
  const amount = offer.offer_type === 'percentage' ? Math.round(subtotal * Math.min(value, 100) / 100)
    : offer.offer_type === 'special_price' ? subtotal - Math.round(value * 100) : Math.round(value * 100);
  return Math.min(subtotal, Math.max(0, amount));
}
// One best promotion per seller. Coupons, automatic discounts and bundles never stack.
export async function sellerDiscount(trx: Knex.Transaction, sellerId: string, items: any[], subtotal: number, coupon?: string) {
  const now = Date.now(); let best = 0;
  const offers = await trx('seller_offers').where({ seller_id: sellerId, is_active: true });
  for (const offer of offers) {
    if (offer.code && offer.code !== coupon?.toUpperCase()) continue;
    if (offer.start_date && new Date(offer.start_date).getTime() > now) continue;
    if (offer.end_date && new Date(offer.end_date).getTime() <= now) continue;
    if (Math.round(Number(offer.min_order_value) * 100) > subtotal) continue;
    best = Math.max(best, discountPaise(subtotal, offer));
  }
  const combos = await trx('combo_offers').where({ seller_id: sellerId, is_active: true });
  for (const combo of combos) {
    const required = await trx('combo_offer_items').where({ combo_offer_id: combo.id });
    if (required.length < 2) continue;
    let unitTotal = 0, bundles = Infinity;
    const used = new Set<string>();
    for (const need of required) {
      const item = items.find(i => i.product_id === need.product_id && (!need.variant_id || i.variant_id === need.variant_id) && !used.has(i.variant_id));
      if (!item) { bundles = 0; break; }
      used.add(item.variant_id); bundles = Math.min(bundles, item.quantity); unitTotal += item.unit_paise;
    }
    if (Number.isFinite(bundles)) best = Math.max(best, Math.max(0, unitTotal - Math.round(Number(combo.combo_price) * 100)) * bundles);
  }
  return Math.min(subtotal, best);
}
