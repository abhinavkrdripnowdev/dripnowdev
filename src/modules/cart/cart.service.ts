import { db } from '../../config/database';
import { randomUUID } from 'crypto';
import { fail } from '../../utils/httpError';
import { z } from 'zod';
const itemSchema = z.object({ product_id: z.string().uuid(), variant_id: z.string().uuid().optional(), quantity: z.number().int().min(1).max(99) }).strict();
export async function getCart(userId: string) {
  const cart = await db('carts').where({ user_id: userId }).first();
  if (!cart) return { cart_id: null, total_amount: 0, grouped_items: [] };
  const rows = await db('cart_items as c').join('products as p', 'p.id', 'c.product_id')
    .join('product_variants as v', 'v.id', 'c.variant_id').where('c.cart_id', cart.id)
    .select('c.*', 'p.name as product_name', 'p.base_price', 'v.price_override', 'v.size', 'v.color');
  const groups: Record<string, any[]> = {}; let total = 0;
  for (const row of rows) {
    const price = Number(row.price_override ?? row.base_price);
    const image = await db('product_images').where({ product_id: row.product_id }).orderBy('display_order').first();
    const item = { ...row, price, total: Math.round(price * row.quantity * 100) / 100, image: image?.image_url, attributes: { size: row.size, color: row.color } };
    total += item.total; (groups[row.seller_id] ??= []).push(item);
  }
  return { cart_id: cart.id, total_amount: Math.round(total * 100) / 100, grouped_items: Object.entries(groups).map(([seller_id, items]) => ({ seller_id, items })) };
}
export async function addToCart(userId: string, input: unknown) {
  const data = itemSchema.parse(input);
  await db.transaction(async trx => {
    await trx('users').where({ id: userId }).forUpdate().first();
    let cart = await trx('carts').where({ user_id: userId }).first();
    if (!cart) { cart = { id: randomUUID(), user_id: userId }; await trx('carts').insert(cart); }
    const product = await trx('products as p').join('seller_profiles as s', 's.id', 'p.seller_id')
      .where({ 'p.id': data.product_id, 'p.is_active': true, 's.status': 'approved', 'p.availability_status': 'in_stock' }).select('p.*').first();
    if (!product) fail('Product unavailable', 404);
    const variants = await trx('product_variants').where({ product_id: product.id, is_active: true });
    const variant = data.variant_id ? variants.find(v => v.id === data.variant_id) : variants.length === 1 ? variants[0] : null;
    if (!variant) fail('Select a valid product variant');
    const item = await trx('cart_items').where({ cart_id: cart.id, variant_id: variant.id }).first();
    const quantity = (item?.quantity ?? 0) + data.quantity;
    const stock = await trx('inventory').where({ variant_id: variant.id }).first();
    if (quantity > 99 || !stock || stock.quantity - stock.reserved_quantity < quantity) fail('Insufficient stock', 409);
    if (item) await trx('cart_items').where({ id: item.id }).update({ quantity });
    else await trx('cart_items').insert({ id: randomUUID(), cart_id: cart.id, product_id: product.id, variant_id: variant.id, seller_id: product.seller_id, quantity });
  });
  return getCart(userId);
}
export async function updateCartItem(userId: string, itemId: string, quantity: number) {
  z.number().int().min(0).max(99).parse(quantity);
  await db.transaction(async trx => {
    await trx('users').where({ id: userId }).forUpdate().first();
    const cart = await trx('carts').where({ user_id: userId }).first();
    if (!cart) fail('Cart not found', 404);
    const item = await trx('cart_items').where({ id: itemId, cart_id: cart.id }).first();
    if (!item) fail('Cart item not found', 404);
    const stock = await trx('inventory').where({ variant_id: item.variant_id }).first();
    if (quantity && (!stock || quantity > stock.quantity - stock.reserved_quantity)) fail('Insufficient stock', 409);
    if (!quantity) await trx('cart_items').where({ id: itemId }).delete();
    else await trx('cart_items').where({ id: itemId }).update({ quantity });
  });
  return getCart(userId);
}
export async function clearCart(userId: string) {
  await db.transaction(async trx => {
    await trx('users').where({ id: userId }).forUpdate().first();
    const cart = await trx('carts').where({ user_id: userId }).first();
    if (cart) await trx('cart_items').where({ cart_id: cart.id }).delete();
  });
}
