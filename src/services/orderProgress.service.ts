import { Knex } from 'knex';
// A multi-seller parent reports the least advanced active shipment.
export async function updateOrderProgress(trx: Knex.Transaction, orderId: string) {
  const parent = await trx('orders').where({ id: orderId }).forUpdate().first();
  if (!parent || ['CANCELLED', 'REFUNDED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'EXCHANGE_COMPLETED', 'COMPLETED', '3_HOUR_RETURN_WINDOW'].includes(parent.status)) return;
  if (parent.payment_method !== 'cod' && parent.payment_status !== 'paid') return;
  const shipments = await trx('seller_orders as s').leftJoin('delivery_tasks as t', 's.id', 't.seller_order_id').where('s.parent_order_id', orderId).select('s.status', 't.status as delivery_status');
  const states = ['SELLER_ORDER_CREATED', 'SELLER_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERY_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
  const sellerState: Record<string, string> = { new: 'SELLER_ORDER_CREATED', accepted: 'SELLER_ACCEPTED', preparing: 'PREPARING', ready_for_pickup: 'READY_FOR_PICKUP', completed: 'DELIVERED' };
  if (!shipments.length) return;
  const index = Math.min(...shipments.map(s => states.indexOf(s.delivery_status && s.delivery_status !== 'AVAILABLE' ? s.delivery_status : sellerState[s.status])));
  if (index >= 0) await trx('orders').where({ id: orderId }).update({ status: states[index], updated_at: trx.fn.now() });
}
