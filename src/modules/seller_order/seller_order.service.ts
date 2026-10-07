import { updateOrderProgress } from '../../services/orderProgress.service';
import { fail } from '../../utils/httpError';
import { db } from '../../config/database';
import { notify } from '../../services/notification.service';
import {
  SellerOrder,
  SellerOrderItem,
  SellerOrderStatus,
  UpdateSellerOrderStatusDTO,
} from './seller_order.types';

export async function getSellerOrders(sellerId: string, status?: SellerOrderStatus): Promise<SellerOrder[]> {
  let query = db('seller_orders')
    .join('users', 'seller_orders.customer_id', 'users.id')
    .where('seller_orders.seller_id', sellerId)
    .select(
      'seller_orders.*',
      'users.full_name as customer_name',
      'users.email as customer_email',
      'users.phone as customer_phone'
    );

  if (status) {
    query = query.where('seller_orders.status', status);
  }

  const orders = await query.orderBy('seller_orders.created_at', 'desc');

  const result: SellerOrder[] = [];
  for (const o of orders) {
    const items = await getSellerOrderItems(o.id);
    result.push({
      ...o,
      subtotal: Number(o.subtotal),
      discount_amount: Number(o.discount_amount),
      total_amount: Number(o.total_amount),
      items,
    });
  }

  return result;
}

export async function getSellerOrderById(orderId: string, sellerId: string): Promise<SellerOrder | null> {
  const order = await db('seller_orders')
    .join('users', 'seller_orders.customer_id', 'users.id')
    .where('seller_orders.id', orderId)
    .where('seller_orders.seller_id', sellerId)
    .select(
      'seller_orders.*',
      'users.full_name as customer_name',
      'users.email as customer_email',
      'users.phone as customer_phone'
    )
    .first();

  if (!order) return null;

  const items = await getSellerOrderItems(order.id);

  return {
    ...order,
    subtotal: Number(order.subtotal),
    discount_amount: Number(order.discount_amount),
    total_amount: Number(order.total_amount),
    items,
  };
}

export async function getSellerOrderItems(orderId: string): Promise<SellerOrderItem[]> {
  const items = await db('seller_order_items').where({ seller_order_id: orderId });
  return items.map((i) => ({
    ...i,
    unit_price: Number(i.unit_price),
    total_price: Number(i.total_price),
  }));
}

export async function updateSellerOrderStatus(
  orderId: string,
  sellerId: string,
  dto: UpdateSellerOrderStatusDTO
): Promise<SellerOrder> {
  const snapshot = await db('seller_orders').where({ id: orderId, seller_id: sellerId }).first();
  if (!snapshot) fail('Seller order not found', 404);
  await db.transaction(async trx => {
    const parent = await trx('orders').where({ id: snapshot.parent_order_id }).forUpdate().first();
    const order = await trx('seller_orders').where({ id: orderId, seller_id: sellerId }).forUpdate().first();
    const seller = await trx('seller_profiles').where({ id: sellerId, status: 'approved' }).first();
    if (!seller || !parent || parent.status === 'CANCELLED' || (parent.payment_method !== 'cod' && parent.payment_status !== 'paid')) fail('Order is not confirmed', 409);
    const transitions: Record<string, string[]> = { new: ['accepted'], accepted: ['preparing'], preparing: ['ready_for_pickup'], ready_for_pickup: [], completed: [], cancelled: [] };
    if (!transitions[order.status]?.includes(dto.status)) fail('Invalid order transition', 409);
    await trx('seller_orders').where({ id: orderId }).update({ status: dto.status, notes: dto.notes ?? order.notes, updated_at: trx.fn.now() });
    await updateOrderProgress(trx, parent.id);
    await trx('audit_logs').insert({ user_id: seller.user_id, action: `SELLER_ORDER_${dto.status.toUpperCase()}`, metadata: JSON.stringify({ seller_order_id: orderId, from: order.status }) });
    await notify(parent.customer_id, `SELLER_ORDER_${dto.status.toUpperCase()}`, dto.status.replaceAll('_', ' '), `Your seller order is now ${dto.status.replaceAll('_', ' ')}.`, { order_id: parent.id, seller_order_id: orderId }, trx);
  });
  return (await getSellerOrderById(orderId, sellerId)) as SellerOrder;
}
