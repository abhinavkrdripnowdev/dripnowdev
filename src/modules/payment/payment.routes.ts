import { Router, Request, Response } from 'express';
import { randomUUID, createHash } from 'crypto';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { razorpayRequest, verifySignature } from '../../integrations/payment/razorpay';
import { fail } from '../../utils/httpError';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

export async function confirmCapturedPayment(entity: any, eventId: string) {
  entity = z.object({ id: z.string().regex(/^pay_[a-zA-Z0-9]+$/), order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/), status: z.string(), currency: z.string(), amount: z.number().int().positive() }).parse(entity);
  if (entity.status !== 'captured' || entity.currency !== 'INR') fail('Payment has not been captured');
  await db.transaction(async trx => {
    const payment = await trx('payments').where({ provider_order_id: entity.order_id }).first();
    if (!payment) fail('Payment order not found', 404);
    const order = await trx('orders').where({ id: payment.order_id }).forUpdate().first();
    if (await trx('payment_transactions').where({ id: eventId }).first()) return;
    if (Number(entity.amount) !== payment.amount_paise) fail('Payment amount mismatch');
    const current = await trx('payments').where({ id: payment.id }).first();
    if (current.provider_payment_id && current.provider_payment_id !== entity.id) fail('Duplicate payment requires reconciliation', 409);
    if (['paid', 'refund_required', 'refunded'].includes(current.status)) {
      await trx('payment_transactions').insert({ id: eventId, payment_id: payment.id, event: 'DUPLICATE_CAPTURE_IGNORED' });
      return;
    }
    const late = order.status === 'CANCELLED';
    await trx('payments').where({ id: payment.id }).update({ provider_payment_id: entity.id, status: late ? 'refund_required' : 'paid' });
    await trx('payment_transactions').insert({ id: eventId, payment_id: payment.id, event: late ? 'LATE_CAPTURE_REFUND_REQUIRED' : 'PAYMENT_CAPTURED' });
    if (late && !await trx('order_requests').where({ order_id: order.id, kind: 'CANCELLATION' }).first()) await trx('order_requests').insert({ id: randomUUID(), order_id: order.id, kind: 'CANCELLATION', reason: 'Payment captured after cancellation', status: 'APPROVED' });
    if (!late) await trx('orders').where({ id: order.id }).update({ payment_status: 'paid', ...(order.status === 'PAYMENT_PENDING' ? { status: 'PAYMENT_CONFIRMED' } : {}) });
    await trx('audit_logs').insert({ user_id: order.customer_id, action: late ? 'LATE_CAPTURE_REFUND_REQUIRED' : 'PAYMENT_CONFIRMED', metadata: JSON.stringify({ order_id: order.id, payment_id: entity.id }) });
  });
}
export async function paymentWebhook(req: Request, res: Response) {
  const signature = req.get('X-Razorpay-Signature') ?? '';
  if (!Buffer.isBuffer(req.body) || !verifySignature(req.body, signature, process.env.RAZORPAY_WEBHOOK_SECRET ?? '')) fail('Invalid webhook signature', 401);
  const event = JSON.parse(req.body.toString('utf8'));
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const entity = event.payload?.payment?.entity;
    if (!entity) fail('Missing payment entity');
    await confirmCapturedPayment(entity, createHash('sha256').update(req.get('X-Razorpay-Event-Id') ?? req.body).digest('hex'));
  }
  sendSuccess(res, { received: true });
}
const router = Router();
router.use(authenticate);
router.post('/orders/:orderId', async (req, res) => {
  const id = z.string().uuid().parse(req.params.orderId);
  const result = await db.transaction(async trx => {
    const order = await trx('orders').where({ id, customer_id: req.user!.id }).forUpdate().first();
    if (!order || order.payment_method !== 'razorpay' || order.status !== 'PAYMENT_PENDING') fail('Order is not payable', 409);
    const payment = await trx('payments').where({ order_id: id }).first();
    if (!payment.provider_order_id) {
      const remote = await razorpayRequest('orders', { amount: payment.amount_paise, currency: 'INR', receipt: id });
      await trx('payments').where({ id: payment.id }).update({ provider_order_id: remote.id });
      payment.provider_order_id = remote.id;
    }
    return { key: process.env.RAZORPAY_KEY_ID, order_id: payment.provider_order_id, amount: payment.amount_paise, currency: 'INR' };
  });
  sendSuccess(res, result);
});
router.post('/verify', async (req, res) => {
  const data = z.object({ order_id: z.string().uuid(), razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/), razorpay_signature: z.string() }).strict().parse(req.body);
  const payment = await db('payments as p').join('orders as o', 'o.id', 'p.order_id')
    .where({ 'o.id': data.order_id, 'o.customer_id': req.user!.id }).select('p.*').first();
  if (!payment || !verifySignature(`${payment.provider_order_id}|${data.razorpay_payment_id}`, data.razorpay_signature, process.env.RAZORPAY_KEY_SECRET ?? '')) fail('Invalid payment signature', 401);
  const entity = await razorpayRequest(`payments/${data.razorpay_payment_id}`);
  if (entity.order_id !== payment.provider_order_id) fail('Payment order mismatch');
  await confirmCapturedPayment(entity, createHash('sha256').update(`verify:${entity.id}`).digest('hex'));
  sendSuccess(res, { verified: true });
});
export default router;
