import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { fail } from '../../utils/httpError';
import { sendSuccess } from '../../utils/response';
import { razorpayRequest } from '../../integrations/payment/razorpay';
import { postJournal } from '../../services/finance.service';
import { notify } from '../../services/notification.service';
import { calculateHaversineDistance } from '../../integrations/maps/distance';
import { deliveryEarning } from '../../services/deliveryEarning.service';

async function createReverseTasks(trx: any, request: any, order: any) {
  const address = JSON.parse(order.address_snapshot);
  const sellerQuery = trx('seller_orders as s').join('seller_locations as l', 'l.seller_id', 's.seller_id').where('s.parent_order_id', order.id).where('l.active', true).select('s.seller_id', 'l.latitude', 'l.longitude');
  let sellers = await sellerQuery;
  if (request.kind === 'EXCHANGE') {
    const exchange = await trx('exchange_requests').where({ id: request.id }).first();
    sellers = await trx('seller_order_items as i').join('seller_orders as s', 's.id', 'i.seller_order_id').join('seller_locations as l', 'l.seller_id', 's.seller_id').where('i.id', exchange.order_item_id).where('l.active', true).select('s.seller_id', 'l.latitude', 'l.longitude');
  }
  if (!sellers.length || address.latitude == null || address.longitude == null) fail('Return route coordinates are missing', 409);
  for (const seller of sellers) {
    const distance = calculateHaversineDistance(Number(address.latitude), Number(address.longitude), Number(seller.latitude), Number(seller.longitude)); const earning = await deliveryEarning(trx, distance, false);
    await trx('reverse_delivery_tasks').insert({ id: randomUUID(), order_request_id: request.id, seller_id: seller.seller_id, kind: request.kind === 'RETURN' ? 'RETURN_PICKUP' : 'EXCHANGE_PICKUP', earning_paise: earning.earningPaise, distance_km: distance, pickup_latitude: address.latitude, pickup_longitude: address.longitude, drop_latitude: seller.latitude, drop_longitude: seller.longitude });
  }
}

export const orderRequestRoutes = Router();
orderRequestRoutes.use(authenticate);
orderRequestRoutes.get('/:id/requests', async (req, res) => {
  if (!await db('orders').where({ id: String(req.params.id), customer_id: req.user!.id }).first()) fail('Order not found', 404);
  sendSuccess(res, await db('order_requests as r').leftJoin('return_requests as rr', 'rr.id', 'r.id').leftJoin('exchange_requests as er', 'er.id', 'r.id').where('r.order_id', String(req.params.id)).select('r.*', 'rr.pickup_status as return_pickup_status', 'rr.inspection_status', 'er.order_item_id', 'er.requested_variant_id', 'er.pickup_status as exchange_pickup_status', 'er.replacement_status'));
});
orderRequestRoutes.post('/:id/requests', async (req, res) => {
  const data = z.object({ kind: z.enum(['RETURN', 'EXCHANGE']), reason: z.string().min(5).max(1000), order_item_id: z.string().uuid().optional(), requested_variant_id: z.string().uuid().optional(), quantity: z.number().int().positive().max(99).default(1) }).strict().superRefine((v, ctx) => { if (v.kind === 'EXCHANGE' && (!v.order_item_id || !v.requested_variant_id)) ctx.addIssue({ code: 'custom', message: 'Exchange requires the original item and replacement variant' }); }).parse(req.body);
  const id = randomUUID();
  await db.transaction(async trx => {
    const order = await trx('orders').where({ id: String(req.params.id), customer_id: req.user!.id }).forUpdate().first();
    if (!order) fail('Order not found', 404);
    if (order.status !== '3_HOUR_RETURN_WINDOW' || !order.return_window_ends_at || new Date(order.return_window_ends_at).getTime() <= Date.now()) fail('The three-hour return window has closed', 409);
    if (await trx('order_requests').where({ order_id: order.id }).whereIn('status', ['REQUESTED','APPROVED','PICKED_UP','INSPECTING','PROCESSING']).first()) fail('This order already has an active return or exchange', 409);
    await trx('order_requests').insert({ id, order_id: order.id, kind: data.kind, reason: data.reason });
    if (data.kind === 'RETURN') { await trx('return_requests').insert({ id }); const payment = await trx('payments').where({ order_id: order.id }).first(); await trx('refunds').insert({ id: randomUUID(), order_request_id: id, order_id: order.id, amount_paise: payment.amount_paise, status: 'REQUESTED' }); }
    else {
      const item = await trx('seller_order_items as i').join('seller_orders as s', 's.id', 'i.seller_order_id').where({ 'i.id': data.order_item_id, 's.parent_order_id': order.id }).select('i.*').first();
      const replacement = item && await trx('product_variants').where({ id: data.requested_variant_id, product_id: item.product_id, is_active: true }).first();
      const stock = replacement && await trx('inventory').where({ variant_id: replacement.id }).first();
      if (!item || !replacement || !stock || Number(stock.quantity) - Number(stock.reserved_quantity) < data.quantity) fail('Requested replacement is unavailable', 409);
      if (data.quantity > item.quantity) fail('Exchange quantity exceeds purchased quantity');
      await trx('exchange_requests').insert({ id, order_item_id: item.id, requested_variant_id: replacement.id, quantity: data.quantity });
    }
    await trx('orders').where({ id: order.id }).update({ status: `${data.kind}_REQUESTED` });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: `${data.kind}_REQUESTED`, metadata: JSON.stringify({ request_id: id, order_id: order.id, reason: data.reason }) });
    await notify(req.user!.id, `${data.kind}_REQUESTED`, `${data.kind.toLowerCase()} requested`, 'Your request was submitted for review.', { order_id: order.id, request_id: id }, trx);
  }); sendSuccess(res, { id });
});

export const adminOrderRequestRoutes = Router();
adminOrderRequestRoutes.use(authenticate, authorize('manager', 'super_admin'));
adminOrderRequestRoutes.get('/', async (_req, res) => sendSuccess(res, await db('order_requests as r').leftJoin('return_requests as rr', 'rr.id', 'r.id').leftJoin('exchange_requests as er', 'er.id', 'r.id').select('r.*', 'rr.pickup_status as return_pickup_status', 'rr.inspection_status', 'er.order_item_id', 'er.requested_variant_id', 'er.pickup_status as exchange_pickup_status', 'er.replacement_status').orderBy('r.created_at', 'desc')));
adminOrderRequestRoutes.patch('/:id', async (req, res) => {
  const data = z.object({ action: z.enum(['APPROVE', 'REJECT']), note: z.string().min(5).max(1000) }).strict().parse(req.body);
  await db.transaction(async trx => {
    const request = await trx('order_requests').where({ id: String(req.params.id) }).forUpdate().first(); if (!request || request.status !== 'REQUESTED') fail('Pending request not found', 404);
    const order = await trx('orders').where({ id: request.order_id }).forUpdate().first();
    if (data.action === 'APPROVE' && request.kind === 'EXCHANGE') {
      const exchange = await trx('exchange_requests').where({ id: request.id }).first();
      const changed = await trx('inventory').where({ variant_id: exchange.requested_variant_id }).whereRaw('quantity - reserved_quantity >= ?', [exchange.quantity]).decrement('quantity', exchange.quantity);
      if (!changed) fail('Replacement stock is no longer available', 409);
      await trx('exchange_requests').where({ id: request.id }).update({ pickup_status: 'SCHEDULED', replacement_status: 'RESERVED' });
    }
    if (data.action === 'APPROVE' && request.kind === 'RETURN') await trx('return_requests').where({ id: request.id }).update({ pickup_status: 'SCHEDULED' });
    if (data.action === 'APPROVE') await createReverseTasks(trx, request, order);
    const approved = data.action === 'APPROVE';
    await trx('order_requests').where({ id: request.id }).update({ status: approved ? 'APPROVED' : 'REJECTED', review_note: data.note });
    await trx('orders').where({ id: order.id }).update({ status: approved ? `${request.kind}_APPROVED` : 'COMPLETED' });
    if (request.kind === 'RETURN') await trx('refunds').where({ order_request_id: request.id }).update({ status: approved ? 'APPROVED' : 'REJECTED' });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: `ORDER_REQUEST_${data.action}`, metadata: JSON.stringify({ request_id: request.id, note: data.note }) });
    await notify(order.customer_id, `${request.kind}_${data.action}D`, `${request.kind.toLowerCase()} ${data.action.toLowerCase()}d`, data.note, { order_id: order.id, request_id: request.id }, trx);
  }); sendSuccess(res, null);
});
adminOrderRequestRoutes.patch('/:id/fulfillment', async (req, res) => {
  const data = z.object({ action: z.enum(['PICKUP_COMPLETED', 'INSPECTION_PASSED', 'INSPECTION_FAILED', 'EXCHANGE_COMPLETED']), note: z.string().min(3).max(1000) }).strict().parse(req.body);
  await db.transaction(async trx => {
    const request = await trx('order_requests').where({ id: String(req.params.id) }).forUpdate().first(); if (!request || !['APPROVED','PICKED_UP','INSPECTING'].includes(request.status)) fail('Approved request not found', 404);
    const order = await trx('orders').where({ id: request.order_id }).forUpdate().first();
    if (data.action === 'PICKUP_COMPLETED') {
      const outstanding = await trx('reverse_delivery_tasks').where({ order_request_id: request.id }).whereNot('kind', 'EXCHANGE_REPLACEMENT').whereNot('status', 'DELIVERED').first();
      if (outstanding) fail('The delivery partner must return the item to the seller first', 409);
      if (request.kind === 'RETURN') await trx('return_requests').where({ id: request.id }).update({ pickup_status: 'COMPLETED', inspection_status: 'PENDING' });
      else {
        await trx('exchange_requests').where({ id: request.id }).update({ pickup_status: 'COMPLETED' });
        const initial = await trx('reverse_delivery_tasks').where({ order_request_id: request.id }).whereNot('kind', 'EXCHANGE_REPLACEMENT').first();
        const earning = await deliveryEarning(trx, Number(initial.distance_km), false);
        await trx('reverse_delivery_tasks').insert({ id: randomUUID(), order_request_id: request.id, seller_id: initial.seller_id, kind: 'EXCHANGE_REPLACEMENT', earning_paise: earning.earningPaise, distance_km: initial.distance_km, pickup_latitude: initial.drop_latitude, pickup_longitude: initial.drop_longitude, drop_latitude: initial.pickup_latitude, drop_longitude: initial.pickup_longitude });
      }
      await trx('order_requests').where({ id: request.id }).update({ status: 'PICKED_UP' });
    } else if (data.action.startsWith('INSPECTION_')) {
      if (request.kind !== 'RETURN' || request.status !== 'PICKED_UP') fail('A picked-up return is required', 409);
      const passed = data.action === 'INSPECTION_PASSED'; await trx('return_requests').where({ id: request.id }).update({ inspection_status: passed ? 'PASSED' : 'FAILED', inspection_note: data.note });
      await trx('order_requests').where({ id: request.id }).update({ status: passed ? 'APPROVED' : 'REJECTED', review_note: data.note }); await trx('orders').where({ id: order.id }).update({ status: passed ? 'RETURN_APPROVED' : 'COMPLETED' });
      await trx('refunds').where({ order_request_id: request.id }).update({ status: passed ? 'APPROVED' : 'REJECTED', ...(passed ? {} : { failure_reason: data.note }) });
    } else {
      if (request.kind !== 'EXCHANGE' || request.status !== 'PICKED_UP') fail('A picked-up exchange is required', 409);
      if (await trx('reverse_delivery_tasks').where({ order_request_id: request.id, kind: 'EXCHANGE_REPLACEMENT' }).whereNot('status', 'DELIVERED').first()) fail('Replacement delivery is not complete', 409);
      const ex = await trx('exchange_requests').where({ id: request.id }).first(); const original = await trx('seller_order_items').where({ id: ex.order_item_id }).first();
      if (original.variant_id) await trx('inventory').where({ variant_id: original.variant_id }).increment('quantity', ex.quantity);
      await trx('exchange_requests').where({ id: request.id }).update({ replacement_status: 'DELIVERED' }); await trx('order_requests').where({ id: request.id }).update({ status: 'COMPLETED', review_note: data.note }); await trx('orders').where({ id: order.id }).update({ status: 'EXCHANGE_COMPLETED' });
    }
    await trx('audit_logs').insert({ user_id: req.user!.id, action: data.action, metadata: JSON.stringify({ request_id: request.id, note: data.note }) });
    await notify(order.customer_id, data.action, data.action.replaceAll('_', ' '), data.note, { order_id: order.id, request_id: request.id }, trx);
  }); sendSuccess(res, null);
});

adminOrderRequestRoutes.post('/:id/refund', authorize('super_admin'), async (req, res) => {
  const data = z.object({ reference: z.string().min(3).max(150) }).strict().parse(req.body);
  const request = await db('order_requests').where({ id: String(req.params.id) }).first();
  if (!request || !['RETURN', 'CANCELLATION'].includes(request.kind) || request.status !== 'APPROVED') fail('Approved refund request required', 409);
  if (request.kind === 'RETURN' && (await db('return_requests').where({ id: request.id }).first())?.inspection_status !== 'PASSED') fail('Return inspection must pass before refund', 409);
  const order = await db('orders').where({ id: request.order_id }).first(); const payment = await db('payments').where({ order_id: order.id }).first();
  await db('refunds').insert({ id: randomUUID(), order_request_id: request.id, order_id: order.id, amount_paise: payment.amount_paise, status: 'PROCESSING' }).onConflict('order_request_id').merge({ status: 'PROCESSING', failure_reason: null });
  const refundId = (await db('refunds').where({ order_request_id: request.id }).first()).id;
  try {
    if (order.payment_method === 'razorpay') {
      if (!/^rfnd_[a-zA-Z0-9]+$/.test(data.reference)) fail('A Razorpay refund ID is required');
      const refund = await razorpayRequest(`refunds/${data.reference}`);
      if (refund.payment_id !== payment.provider_payment_id || refund.status !== 'processed' || Number(refund.amount) !== payment.amount_paise) fail('Refund is not a completed full refund for this order', 409);
    }
    await db.transaction(async trx => {
      const changed = await trx('order_requests').where({ id: request.id, status: 'APPROVED' }).update({ status: 'REFUNDED', refund_id: data.reference }); if (!changed) fail('Refund already recorded', 409);
      await trx('orders').where({ id: order.id }).update({ status: 'REFUNDED', payment_status: 'refunded' }); await trx('payments').where({ id: payment.id }).update({ status: 'refunded' });
      await trx('refunds').where({ order_request_id: request.id }).update({ status: 'COMPLETED', provider_reference: data.reference, completed_at: new Date() });
      await postJournal(trx, { type: 'REFUND', referenceType: 'REFUND', referenceId: refundId, idempotencyKey: `refund:${request.id}`, entries: [
        { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: 'ORDER_ESCROW', direction: 'DEBIT', amountPaise: Number(payment.amount_paise) },
        { ownerType: 'PLATFORM', ownerId: 'PLATFORM', accountType: order.payment_method === 'razorpay' ? 'PAYMENT_PROCESSOR_CLEARING' : 'COD_REFUND_CLEARING', direction: 'CREDIT', amountPaise: Number(payment.amount_paise) },
      ] });
      await trx('payment_transactions').insert({ id: randomUUID(), payment_id: payment.id, event: 'REFUND_RECONCILED' }); await trx('audit_logs').insert({ user_id: req.user!.id, action: 'REFUND_RECONCILED', metadata: JSON.stringify({ request_id: request.id, reference: data.reference }) });
      await notify(order.customer_id, 'REFUND_COMPLETED', 'Refund completed', 'Your refund has been completed.', { order_id: order.id, reference: data.reference }, trx);
    });
  } catch (error) { await db('refunds').where({ order_request_id: request.id }).update({ status: 'FAILED', failure_reason: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown failure' }); throw error; }
  sendSuccess(res, null);
});
