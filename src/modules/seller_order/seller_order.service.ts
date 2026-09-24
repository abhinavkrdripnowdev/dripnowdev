import { db } from '../../config/database';
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
  const order = await db('seller_orders')
    .where({ id: orderId, seller_id: sellerId })
    .first();

  if (!order) {
    throw new Error('Seller order not found');
  }

  // Validate allowed state transitions
  const currentStatus: SellerOrderStatus = order.status;
  const allowedTransitions: Record<SellerOrderStatus, SellerOrderStatus[]> = {
    new: ['accepted', 'cancelled'],
    accepted: ['preparing', 'cancelled'],
    preparing: ['ready_for_pickup', 'cancelled'],
    ready_for_pickup: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  if (!allowedTransitions[currentStatus].includes(dto.status)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${dto.status}'`);
  }

  await db('seller_orders')
    .where({ id: orderId })
    .update({
      status: dto.status,
      notes: dto.notes ?? order.notes,
      updated_at: db.fn.now(),
    });

  // Create audit log for order status change
  const sellerProfile = await db('seller_profiles').where({ id: order.seller_id }).first();
  await db('audit_logs').insert({
    user_id: sellerProfile?.user_id ?? null,
    action: `SELLER_ORDER_STATUS_${dto.status.toUpperCase()}`,
    metadata: JSON.stringify({ entity_type: 'seller_order', entity_id: orderId, previous_status: currentStatus, new_status: dto.status, notes: dto.notes }),
  });

  return (await getSellerOrderById(orderId, sellerId)) as SellerOrder;
}
