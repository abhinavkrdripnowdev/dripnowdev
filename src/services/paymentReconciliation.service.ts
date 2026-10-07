import { db } from '../config/database';
import { razorpayRequest } from '../integrations/payment/razorpay';

export async function reconcilePendingPayments() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return 0;
  const pending = await db('payments').where({ status: 'pending' }).whereNotNull('provider_order_id').where('created_at', '<', new Date(Date.now() - 5 * 60000)).limit(50);
  let reconciled = 0;
  for (const payment of pending) {
    try {
      const response = await razorpayRequest(`orders/${payment.provider_order_id}/payments`);
      const captured = response.items?.find((item: any) => item.status === 'captured');
      if (captured) { const { confirmCapturedPayment } = await import('../modules/payment/payment.routes'); await confirmCapturedPayment(captured, `reconcile:${captured.id}`); reconciled++; }
    } catch (error) {
      await db('security_events').insert({ user_id: null, event_type: 'payment_reconciliation_failed', severity: 'warning', details: JSON.stringify({ payment_id: payment.id, message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown failure' }) });
    }
  }
  return reconciled;
}
