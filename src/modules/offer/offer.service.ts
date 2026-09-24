import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import {
  SellerOffer,
  ComboOffer,
  CreateOfferDTO,
  CreateComboOfferDTO,
} from './offer.types';

export async function createSellerOffer(sellerId: string, data: CreateOfferDTO): Promise<SellerOffer> {
  const offerId = uuidv4();
  await db('seller_offers').insert({
    id: offerId,
    seller_id: sellerId,
    title: data.title,
    code: data.code ? data.code.toUpperCase() : null,
    offer_type: data.offer_type,
    discount_value: data.discount_value,
    min_order_value: data.min_order_value ?? 0,
    start_date: data.start_date ?? null,
    end_date: data.end_date ?? null,
    is_active: true,
  });

  const offer = await db('seller_offers').where({ id: offerId }).first();
  return {
    ...offer,
    discount_value: Number(offer.discount_value),
    min_order_value: Number(offer.min_order_value),
  };
}

export async function getSellerOffers(sellerId: string): Promise<SellerOffer[]> {
  const offers = await db('seller_offers').where({ seller_id: sellerId }).orderBy('created_at', 'desc');
  return offers.map((o) => ({
    ...o,
    discount_value: Number(o.discount_value),
    min_order_value: Number(o.min_order_value),
  }));
}

export async function getOfferByCode(code: string): Promise<SellerOffer | null> {
  const offer = await db('seller_offers')
    .where({ code: code.toUpperCase(), is_active: true })
    .first();

  if (!offer) return null;

  return {
    ...offer,
    discount_value: Number(offer.discount_value),
    min_order_value: Number(offer.min_order_value),
  };
}

export async function createComboOffer(sellerId: string, data: CreateComboOfferDTO): Promise<ComboOffer> {
  const comboId = uuidv4();
  await db('combo_offers').insert({
    id: comboId,
    seller_id: sellerId,
    name: data.name,
    description: data.description ?? null,
    combo_price: data.combo_price,
    is_active: true,
  });

  for (const item of data.items) {
    await db('combo_offer_items').insert({
      id: uuidv4(),
      combo_offer_id: comboId,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
    });
  }

  return getComboOfferById(comboId) as Promise<ComboOffer>;
}

export async function getComboOfferById(comboId: string): Promise<ComboOffer | null> {
  const combo = await db('combo_offers').where({ id: comboId }).first();
  if (!combo) return null;

  const items = await db('combo_offer_items')
    .join('products', 'combo_offer_items.product_id', 'products.id')
    .where({ combo_offer_id: comboId })
    .select('combo_offer_items.*', 'products.name as product_name');

  return {
    ...combo,
    combo_price: Number(combo.combo_price),
    items,
  };
}

export async function getSellerComboOffers(sellerId: string): Promise<ComboOffer[]> {
  const combos = await db('combo_offers').where({ seller_id: sellerId }).orderBy('created_at', 'desc');
  const result: ComboOffer[] = [];
  for (const c of combos) {
    const full = await getComboOfferById(c.id);
    if (full) result.push(full);
  }
  return result;
}
