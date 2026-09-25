import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { fail } from '../../utils/httpError';
import { sendSuccess } from '../../utils/response';
import { razorpayRequest } from '../../integrations/payment/razorpay';

export const orderRequestRoutes = Router();
orderRequestRoutes.use(authenticate);
orderRequestRoutes.get('/:id/requests', async (req, res) => {
  if (!await db('orders').where({ id: String(req.params.id), customer_id: req.user!.id }).first()) fail('Order not found', 404);
  sendSuccess(res, await db('order_requests').where({ order_id: String(req.params.id) }));
});
orderRequestRoutes.post('/:id/requests', async (req, res) => {
  const data = z.object({ kind: z.enum(['RETURN', 'EXCHANGE']), reason: z.string().min(5).max(1000) }).strict().parse(req.body);
  const id = randomUUID();
  await db.transaction(async trx => {
    const order = await trx('orders').where({ id: String(req.params.id), customer_id: req.user!.id }).forUpdate().first();
    if (!order) fail('Order not found', 404);
    if (order.status !== '3_HOUR_RETURN_WINDOW' || !order.return_window_ends_at || new Date(order.return_window_ends_at).getTime() <= Date.now()) fail('The three-hour return window has closed', 409);
    await trx('order_requests').insert({ id, order_id: order.id, ...data });
    await trx('orders').where({ id: order.id }).update({ status: `${data.kind}_REQUESTED` });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: `${data.kind}_REQUESTED`, metadata: JSON.stringify({ order_id: order.id, reason: data.reason }) });
  }); sendSuccess(res, { id });
});
export const adminOrderRequestRoutes = Router();
adminOrderRequestRoutes.use(authenticate, authorize('manager', 'super_admin'));
adminOrderRequestRoutes.get('/', async (_req, res) => { sendSuccess(res, await db('order_requests').orderBy('created_at', 'desc')); });
adminOrderRequestRoutes.patch('/:id', async (req, res) => {
  const data = z.object({ action: z.enum(['APPROVE', 'REJECT', 'EXCHANGE_COMPLETED']), note: z.string().min(5).max(1000) }).strict().parse(req.body);
  await db.transaction(async trx => {
    const request = await trx('order_requests').where({ id: String(req.params.id) }).forUpdate().first();
    if (!request) fail('Request not found', 404);
    const order = await trx('orders').where({ id: request.order_id }).forUpdate().first();
    if (data.action === 'EXCHANGE_COMPLETED') {
      if (request.kind !== 'EXCHANGE' || request.status !== 'APPROVED') fail('An approved exchange is required', 409);
      await trx('order_requests').where({ id: request.id }).update({ status: 'COMPLETED', review_note: data.note });
      await trx('orders').where({ id: order.id }).update({ status: 'EXCHANGE_COMPLETED' });
    } else {
      if (request.status !== 'REQUESTED') fail('Request already reviewed', 409);
      const approved = data.action === 'APPROVE';
      await trx('order_requests').where({ id: request.id }).update({ status: approved ? 'APPROVED' : 'REJECTED', review_note: data.note });
      await trx('orders').where({ id: order.id }).update({ status: approved ? `${request.kind}_APPROVED` : 'COMPLETED' });
    }
    await trx('audit_logs').insert({ user_id: req.user!.id, action: `ORDER_REQUEST_${data.action}`, metadata: JSON.stringify({ request_id: request.id, note: data.note }) });
  }); sendSuccess(res, null);
});
// Refunds are performed in the provider dashboard, then verified here. This avoids
// unsafe automatic retries of an external money movement after an ambiguous timeout.
adminOrderRequestRoutes.post('/:id/refund', async (req, res) => {
  const data = z.object({ reference: z.string().min(3).max(100) }).strict().parse(req.body);
  const request = await db('order_requests').where({ id: String(req.params.id) }).first();
  if (!request || !['RETURN', 'CANCELLATION'].includes(request.kind) || request.status !== 'APPROVED') fail('Approved refund request required', 409);
  const order = await db('orders').where({ id: request.order_id }).first();
  const payment = await db('payments').where({ order_id: order.id }).first();
  if (order.payment_method === 'razorpay') {
    if (!/^rfnd_[a-zA-Z0-9]+$/.test(data.reference)) fail('A Razorpay refund ID is required');
    const refund = await razorpayRequest(`refunds/${data.reference}`);
    if (refund.payment_id !== payment.provider_payment_id || refund.status !== 'processed' || Number(refund.amount) !== payment.amount_paise) fail('Refund is not a completed full refund for this order', 409);
  }
  await db.transaction(async trx => {
    const changed = await trx('order_requests').where({ id: request.id, status: 'APPROVED' }).update({ status: 'REFUNDED', refund_id: data.reference });
    if (!changed) fail('Refund already recorded', 409);
    await trx('orders').where({ id: order.id }).update({ status: 'REFUNDED', payment_status: 'refunded' });
    await trx('payments').where({ id: payment.id }).update({ status: 'refunded' });
    await trx('payment_transactions').insert({ id: randomUUID(), payment_id: payment.id, event: 'REFUND_RECONCILED' });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'REFUND_RECONCILED', metadata: JSON.stringify({ request_id: request.id, reference: data.reference }) });
  }); sendSuccess(res, null);
});
