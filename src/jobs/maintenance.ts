import { cancelOrder } from '../modules/order/order.service';
import { db } from '../config/database';
export async function maintenance() {
  const expired = await db('orders').where({ status: 'PAYMENT_PENDING', payment_status: 'pending' }).where('created_at', '<', new Date(Date.now() - 30 * 60000));
  for (const order of expired) { try { await cancelOrder(order.id, order.customer_id); } catch { /* Concurrent capture or fulfillment wins. */ } }
  await db('orders').where({ status: '3_HOUR_RETURN_WINDOW' }).where('return_window_ends_at', '<=', new Date()).update({ status: 'COMPLETED', updated_at: db.fn.now() });
  await db('verification_tokens').where('expires_at', '<', new Date(Date.now() - 24 * 3600000)).delete();
  await db('consumed_proofs').where('consumed_at', '<', new Date(Date.now() - 24 * 3600000)).delete();
  await db('sessions').where('expires_at', '<', new Date()).update({ revoked: true });
}
if (require.main === module) maintenance().then(() => db.destroy()).catch(async error => { console.error(error); await db.destroy(); process.exitCode = 1; });
