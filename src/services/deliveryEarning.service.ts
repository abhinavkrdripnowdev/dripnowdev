import type { Knex } from 'knex';
export async function deliveryEarning(trx: Knex.Transaction | Knex, distanceKm: number, multiSeller: boolean) {
  const rule = await trx('delivery_earning_rules').where({ active: true }).orderBy('effective_from', 'desc').first();
  if (!rule) return { earningPaise: 0, bonusPaise: 0 };
  const units = Math.max(0, Math.ceil((distanceKm - Number(rule.base_distance_km)) / Number(rule.additional_distance_unit_km)));
  const bonusPaise = multiSeller ? Number(rule.multi_seller_addition_paise) : 0;
  return { earningPaise: Number(rule.base_amount_paise) + units * Number(rule.additional_amount_paise) + bonusPaise, bonusPaise };
}
