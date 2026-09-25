import { platformSettings } from '../../services/settings.service';
import { sellerDiscount } from '../../services/pricing.service';
import { db } from '../../config/database';
import { randomUUID } from 'crypto';
import { calculateDistance } from '../../integrations/maps/distance';
import { fail } from '../../utils/httpError';
import { z } from 'zod';

export async function checkout(userId: string, addressId: string, paymentMethod: string, checkoutKey?: string, quoteOnly = false, couponCode?: string) {
  z.string().uuid().parse(addressId);
  z.enum(['cod', 'razorpay']).parse(paymentMethod);
  if (checkoutKey) z.string().min(8).max(100).parse(checkoutKey);
  return db.transaction(async trx => {
    await trx('users').where({ id: userId }).forUpdate().first();
    if (checkoutKey) {
      const previous = await trx('orders').where({ customer_id: userId, checkout_key: checkoutKey }).first();
      if (previous) return { ...previous, order_id: previous.id };
    }
    const cart = await trx('carts').where({ user_id: userId }).forUpdate().first();
    if (!cart) fail('Cart is empty');
    const items = await trx('cart_items as c').join('products as p', 'c.product_id', 'p.id')
      .join('product_variants as v', 'c.variant_id', 'v.id').join('seller_profiles as s', 'p.seller_id', 's.id')
      .where('c.cart_id', cart.id).select('c.*', 'p.name', 'p.base_price', 'p.is_active', 'p.availability_status',
        'v.price_override', 'v.size', 'v.color', 'v.product_id as variant_product_id', 'v.is_active as variant_active', 's.status as seller_status');
    if (!items.length) fail('Cart is empty');
    const address = await trx('addresses').where({ id: addressId, user_id: userId }).whereNull('deleted_at').first();
    if (!address || address.latitude == null || address.longitude == null) fail('Select an address with map coordinates');
    const settings = await platformSettings(trx);
    const groups: Record<string, any[]> = {};
    let subtotalPaise = 0, deliveryPaise = 0, discountTotal = 0;
    for (const item of items) {
      if (!item.is_active || !item.variant_active || item.seller_status !== 'approved' || item.availability_status !== 'in_stock' || item.variant_product_id !== item.product_id) fail('An item is unavailable', 409);
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) fail('Invalid quantity');
      const stock = await trx('inventory').where({ variant_id: item.variant_id }).first();
      if (!stock || stock.quantity - stock.reserved_quantity < item.quantity) fail('Insufficient stock', 409);
      if (!quoteOnly) {
        const changed = await trx('inventory').where({ variant_id: item.variant_id }).whereRaw('quantity - reserved_quantity >= ?', [item.quantity]).decrement('quantity', item.quantity);
        if (!changed) fail('Insufficient stock', 409);
      }
      item.unit_paise = Math.round(Number(item.price_override ?? item.base_price) * 100);
      subtotalPaise += item.unit_paise * item.quantity;
      (groups[item.seller_id] ??= []).push(item);
    }
    const orderId = randomUUID();
    const shipments: any[] = [];
    for (const [sellerId, sellerItems] of Object.entries(groups)) {
      const location = await trx('seller_locations').where({ seller_id: sellerId, active: true }).first();
      if (!location || location.latitude == null || location.longitude == null) fail('Seller pickup location is missing', 409);
      const distance = calculateDistance(Number(location.latitude), Number(location.longitude), Number(address.latitude), Number(address.longitude));
      const fee = Math.round(settings.delivery_base_paise + Math.max(0, distance.distance_km - settings.delivery_free_km) * settings.delivery_per_km_paise);
      deliveryPaise += fee;
      const subtotal = sellerItems.reduce((sum, i) => sum + i.unit_paise * i.quantity, 0);
      const discount = await sellerDiscount(trx, sellerId, sellerItems, subtotal, couponCode); discountTotal += discount;
      shipments.push({ discount, id: randomUUID(), sellerId, items: sellerItems, fee, subtotal: sellerItems.reduce((sum, i) => sum + i.unit_paise * i.quantity, 0) });
    }
    const platformPaise = settings.platform_fee_paise;
    let taxPaise = 0;
    for (const [index, shipment] of shipments.entries()) { shipment.tax = Math.round((shipment.subtotal - shipment.discount) * settings.tax_basis_points / 10000); taxPaise += shipment.tax; shipment.platform = index === 0 ? platformPaise : 0; }
    if (quoteOnly) return { order_id: '', total_amount: subtotalPaise / 100, delivery_fee: deliveryPaise / 100, discount_amount: discountTotal / 100, tax_amount: taxPaise / 100, platform_fee: platformPaise / 100, final_amount: (subtotalPaise + deliveryPaise - discountTotal + taxPaise + platformPaise) / 100 };
    await trx('orders').insert({ id: orderId, customer_id: userId, address_id: addressId, address_snapshot: JSON.stringify(address),
      checkout_key: checkoutKey ?? null, total_amount: subtotalPaise / 100, delivery_fee: deliveryPaise / 100,
      discount_amount: discountTotal / 100, tax_amount: taxPaise / 100, platform_fee: platformPaise / 100, final_amount: (subtotalPaise + deliveryPaise - discountTotal + taxPaise + platformPaise) / 100, payment_method: paymentMethod, payment_status: 'pending',
      status: paymentMethod === 'cod' ? 'PAYMENT_CONFIRMED' : 'PAYMENT_PENDING' });
    for (const shipment of shipments) {
      await trx('seller_orders').insert({ id: shipment.id, parent_order_id: orderId, seller_id: shipment.sellerId, customer_id: userId,
        subtotal: shipment.subtotal / 100, discount_amount: shipment.discount / 100, total_amount: (shipment.subtotal + shipment.fee - shipment.discount + shipment.tax + shipment.platform) / 100, status: 'new' });
      await trx('seller_order_items').insert(shipment.items.map((i: any) => ({ id: randomUUID(), seller_order_id: shipment.id,
        product_id: i.product_id, variant_id: i.variant_id, product_name: i.name, variant_info: JSON.stringify({ size: i.size, color: i.color }),
        quantity: i.quantity, unit_price: i.unit_paise / 100, total_price: i.unit_paise * i.quantity / 100 })));
    }
    await trx('payments').insert({ id: randomUUID(), order_id: orderId, amount_paise: subtotalPaise + deliveryPaise - discountTotal + taxPaise + platformPaise, status: paymentMethod === 'cod' ? 'cod_pending' : 'pending' });
    await trx('cart_items').where({ cart_id: cart.id }).delete();
    await trx('audit_logs').insert({ user_id: userId, action: 'CHECKOUT_CREATED', metadata: JSON.stringify({ order_id: orderId }) });
    return { order_id: orderId, total_amount: subtotalPaise / 100, delivery_fee: deliveryPaise / 100, discount_amount: discountTotal / 100, tax_amount: taxPaise / 100, platform_fee: platformPaise / 100, final_amount: (subtotalPaise + deliveryPaise - discountTotal + taxPaise + platformPaise) / 100 };
  });
}

export async function getCustomerOrders(userId: string) {
  const orders = await db('orders')
    .where({ customer_id: userId })
    .orderBy('created_at', 'desc');

  for (const order of orders) {
    order.seller_orders = await db('seller_orders')
      .where({ parent_order_id: order.id });
    
    for (const sOrder of order.seller_orders) {
      sOrder.items = await db('seller_order_items').where({ seller_order_id: sOrder.id });
      const seller = await db('seller_profiles').where({ id: sOrder.seller_id }).first();
      sOrder.seller_name = seller?.business_name || 'Seller';
    }
  }

  return orders;
}

export async function getOrderDetails(orderId: string, userId: string) {
  const order = await db('orders')
    .where({ id: orderId, customer_id: userId })
    .first();
  if (!order) throw new Error('Order not found');

  order.seller_orders = await db('seller_orders')
    .where({ parent_order_id: order.id });
  
  for (const sOrder of order.seller_orders) {
    sOrder.items = await db('seller_order_items').where({ seller_order_id: sOrder.id });
    const seller = await db('seller_profiles').where({ id: sOrder.seller_id }).first();
    sOrder.seller_name = seller?.business_name || 'Seller';
  }

  return order;
}


export async function cancelOrder(orderId: string, userId: string) {
  await db.transaction(async trx => {
    const order = await trx('orders').where({ id: orderId, customer_id: userId }).forUpdate().first();
    if (!order) fail('Order not found', 404);
    if (order.status === 'CANCELLED') return;
    const shipments = await trx('seller_orders').where({ parent_order_id: orderId }).forUpdate();
    if (shipments.some(s => s.status !== 'new')) fail('Order preparation has started', 409);
    if (order.payment_status === 'paid') await trx('order_requests').insert({ id: randomUUID(), order_id: order.id, kind: 'CANCELLATION', reason: 'Customer cancellation before preparation', status: 'APPROVED' });
    if (!['ORDER_CREATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'SELLER_ORDER_CREATED'].includes(order.status)) fail('Order cannot be cancelled', 409);
    for (const shipment of shipments) {
      const items = await trx('seller_order_items').where({ seller_order_id: shipment.id });
      for (const item of items) await trx('inventory').where({ variant_id: item.variant_id }).increment('quantity', item.quantity);
    }
    await trx('orders').where({ id: orderId }).update({ status: 'CANCELLED', updated_at: trx.fn.now() });
    await trx('seller_orders').where({ parent_order_id: orderId }).update({ status: 'cancelled' });
    await trx('audit_logs').insert({ user_id: userId, action: 'ORDER_CANCELLED', metadata: JSON.stringify({ order_id: orderId }) });
  });
  return { success: true };
}
