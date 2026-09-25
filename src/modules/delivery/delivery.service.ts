import { platformSettings } from '../../services/settings.service';
import { updateOrderProgress } from '../../services/orderProgress.service';
import { db } from '../../config/database';
import { randomUUID } from 'crypto';
import { calculateHaversineDistance } from '../../integrations/maps/distance';
import { fail } from '../../utils/httpError';

export async function profile(userId: string) {
  const p = await db('delivery_partner_profiles').where({ user_id: userId }).first();
  if (!p) fail('Complete your delivery application first', 404);
  return p;
}
export async function availableTasks(userId: string) {
  const p = await profile(userId);
  if (p.status !== 'APPROVED' || !p.available) return [];
  const busy = await db('delivery_tasks').where({ partner_id: p.id }).whereNotIn('status', ['DELIVERED', 'CANCELLED']).first();
  if (busy) return [];
  const location = await db('delivery_partner_locations').where({ partner_id: p.id }).first();
  if (!location || Date.now() - new Date(location.updated_at).getTime() > 5 * 60000) return [];
  const rows = await db('seller_orders as s').join('seller_locations as l', 's.seller_id', 'l.seller_id')
    .join('orders as o', 'o.id', 's.parent_order_id').where('s.status', 'ready_for_pickup')
    .whereNot('o.status', 'CANCELLED').select('s.id', 's.parent_order_id', 'l.latitude', 'l.longitude', 'l.address_line1');
  const settings = await platformSettings();
  const result = [];
  for (const row of rows) {
    if (row.latitude == null || row.longitude == null) continue;
    const distance = calculateHaversineDistance(Number(location.latitude), Number(location.longitude), Number(row.latitude), Number(row.longitude));
    if (distance > settings.matching_radius_km) continue;
    let task = await db('delivery_tasks').where({ seller_order_id: row.id }).first();
    if (!task) {
      const order = await db('orders').where({ id: row.parent_order_id }).first();
      const address = JSON.parse(order.address_snapshot);
      const routeKm = calculateHaversineDistance(Number(row.latitude), Number(row.longitude), Number(address.latitude), Number(address.longitude));
      await db('delivery_tasks').insert({ id: randomUUID(), seller_order_id: row.id, earning_paise: Math.round(settings.partner_base_paise + routeKm * settings.partner_per_km_paise) }).onConflict('seller_order_id').ignore();
      task = await db('delivery_tasks').where({ seller_order_id: row.id }).first();
    }
    if (task.status !== 'AVAILABLE') continue;
    await db('delivery_assignments').insert({ id: randomUUID(), task_id: task.id, partner_id: p.id }).onConflict(['task_id', 'partner_id']).ignore();
    result.push({ ...task, pickup_address: row.address_line1, latitude: row.latitude, longitude: row.longitude, distance_km: distance });
  }
  return result;
}
export async function acceptTask(userId: string, taskId: string) {
  // Recheck distance, freshness, availability and approval at acceptance time.
  if (!(await availableTasks(userId)).some(t => t.id === taskId)) fail('Task is no longer available', 409);
  await db.transaction(async trx => {
    const p = await trx('delivery_partner_profiles').where({ user_id: userId }).forUpdate().first();
    if (!p || p.status !== 'APPROVED' || !p.available) fail('Partner unavailable', 409);
    const busy = await trx('delivery_tasks').where({ partner_id: p.id }).whereNotIn('status', ['DELIVERED', 'CANCELLED']).first();
    if (busy) fail('Finish your current delivery first', 409);
    const changed = await trx('delivery_tasks').where({ id: taskId, status: 'AVAILABLE' }).update({ partner_id: p.id, status: 'DELIVERY_ASSIGNED' });
    if (!changed) fail('Task already assigned', 409);
    const task = await trx('delivery_tasks').where({ id: taskId }).first();
    const shipment = await trx('seller_orders').where({ id: task.seller_order_id }).first();
    await updateOrderProgress(trx, shipment.parent_order_id);
    await trx('delivery_assignments').where({ task_id: taskId, partner_id: p.id }).update({ status: 'ACCEPTED' });
    await trx('delivery_assignments').where({ task_id: taskId }).whereNot('partner_id', p.id).update({ status: 'EXPIRED' });
    await trx('audit_logs').insert({ user_id: userId, action: 'DELIVERY_ASSIGNED', metadata: JSON.stringify({ task_id: taskId }) });
  });
}
export async function progressTask(userId: string, taskId: string, status: string, cashPaise?: number) {
  const transitions: Record<string, string> = { DELIVERY_ASSIGNED: 'PICKED_UP', PICKED_UP: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED' };
  await db.transaction(async trx => {
    const p = await trx('delivery_partner_profiles').where({ user_id: userId, status: 'APPROVED' }).first();
    if (!p) fail('Partner not approved', 403);
    const task = await trx('delivery_tasks').where({ id: taskId, partner_id: p.id }).forUpdate().first();
    if (!task || transitions[task.status] !== status) fail('Invalid delivery transition', 409);
    const shipment = await trx('seller_orders').where({ id: task.seller_order_id }).first();
    const order = await trx('orders').where({ id: shipment.parent_order_id }).forUpdate().first();
    if (order.status === 'CANCELLED') fail('Order cancelled', 409);
    if (status === 'DELIVERED') {
      if (order.payment_method === 'cod') {
        const due = Math.round(Number(shipment.total_amount) * 100);
        if (cashPaise !== due) fail(`Collect exactly ${due} paise before completing delivery`);
        await trx('cod_records').insert({ id: randomUUID(), task_id: taskId, partner_id: p.id, amount_paise: due });
      }
      await trx('seller_orders').where({ id: shipment.id }).update({ status: 'completed' });
      const unfinished = await trx('seller_orders').where({ parent_order_id: order.id }).whereNot('status', 'completed').first();
      if (!unfinished) {
        await trx('orders').where({ id: order.id }).update({ status: '3_HOUR_RETURN_WINDOW', return_window_ends_at: new Date(Date.now() + 3 * 3600000), ...(order.payment_method === 'cod' ? { payment_status: 'paid' } : {}) });
        if (order.payment_method === 'cod') await trx('payments').where({ order_id: order.id }).update({ status: 'cod_collected' });
      }
    }
    await trx('delivery_tasks').where({ id: taskId }).update({ status, ...(status === 'DELIVERED' ? { delivered_at: new Date() } : {}) });
    await updateOrderProgress(trx, order.id);
    await trx('audit_logs').insert({ user_id: userId, action: status, metadata: JSON.stringify({ task_id: taskId }) });
  });
}
export async function trackOrder(userId: string, orderId: string) {
  const order = await db('orders').where({ id: orderId, customer_id: userId }).first();
  if (!order) fail('Order not found', 404);
  const tasks = await db('delivery_tasks as t').join('seller_orders as s', 's.id', 't.seller_order_id')
    .leftJoin('delivery_partner_locations as l', 'l.partner_id', 't.partner_id').where('s.parent_order_id', orderId)
    .select('t.id', 't.status', 't.seller_order_id', 'l.latitude', 'l.longitude', 'l.updated_at');
  return tasks.map(t => ({ ...t, ...(t.status === 'DELIVERED' || t.status === 'CANCELLED' ? { latitude: null, longitude: null, updated_at: null } : {}), stale: !t.updated_at || Date.now() - new Date(t.updated_at).getTime() > 5 * 60000 }));
}
