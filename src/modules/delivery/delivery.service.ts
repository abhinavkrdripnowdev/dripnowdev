import { platformSettings } from '../../services/settings.service';
import { updateOrderProgress } from '../../services/orderProgress.service';
import { db } from '../../config/database';
import { randomUUID } from 'crypto';
import { calculateHaversineDistance } from '../../integrations/maps/distance';
import { fail } from '../../utils/httpError';
import { accrueDeliveryEarning, recordCustomerFunds } from '../../services/finance.service';
import { notify } from '../../services/notification.service';
import { deliveryEarning } from '../../services/deliveryEarning.service';

export async function profile(userId: string) {
  const p = await db('delivery_partner_profiles').where({ user_id: userId }).first();
  if (!p) fail('Complete your delivery application first', 404);
  return p;
}
export async function availableTasks(userId: string) {
  const p = await profile(userId);
  if (p.status !== 'APPROVED' || !p.available) return [];
  const busy = await db('delivery_tasks').where({ partner_id: p.id }).whereNotIn('status', ['DELIVERED', 'CANCELLED']).first();
  const reverseBusy = await db('reverse_delivery_tasks').where({ partner_id: p.id }).whereNotIn('status', ['DELIVERED', 'CANCELLED']).first();
  if (busy || reverseBusy) return [];
  const location = await db('delivery_partner_locations').where({ partner_id: p.id }).first();
  if (!location || Date.now() - new Date(location.updated_at).getTime() > 5 * 60000) return [];
  const rows = await db('seller_orders as s').join('seller_locations as l', 's.seller_id', 'l.seller_id')
    .join('seller_profiles as sp', 'sp.id', 's.seller_id')
    .join('orders as o', 'o.id', 's.parent_order_id').where('s.status', 'ready_for_pickup')
    .whereNot('o.status', 'CANCELLED').select(
      's.id', 's.parent_order_id', 'l.latitude', 'l.longitude', 'l.address_line1', 'l.city',
      'sp.business_name', 'o.address_snapshot', 'o.payment_method'
    );
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
      const shipmentCount = Number((await db('seller_orders').where({ parent_order_id: row.parent_order_id }).count({ count: '*' }).first())?.count ?? 1);
      const calculated = await deliveryEarning(db, routeKm, shipmentCount > 1);
      const earning = calculated.earningPaise || Math.round(settings.partner_base_paise + routeKm * settings.partner_per_km_paise);
      await db('delivery_tasks').insert({ id: randomUUID(), seller_order_id: row.id, earning_paise: earning, distance_km: routeKm, multi_seller_bonus_paise: calculated.bonusPaise }).onConflict('seller_order_id').ignore();
      task = await db('delivery_tasks').where({ seller_order_id: row.id }).first();
    }
    if (task.status !== 'AVAILABLE') continue;
    await db('delivery_assignments').insert({ id: randomUUID(), task_id: task.id, partner_id: p.id }).onConflict(['task_id', 'partner_id']).ignore();
    const dropAddress = typeof row.address_snapshot === 'string' ? JSON.parse(row.address_snapshot) : row.address_snapshot;
    result.push({
      ...task,
      order_id: row.parent_order_id,
      pickup_name: row.business_name,
      pickup_address: row.address_line1,
      pickup_city: row.city,
      pickup_latitude: row.latitude,
      pickup_longitude: row.longitude,
      drop_address: dropAddress,
      payment_method: row.payment_method,
      distance_to_pickup_km: distance,
    });
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
    const reverseBusy = await trx('reverse_delivery_tasks').where({ partner_id: p.id }).whereNotIn('status', ['DELIVERED', 'CANCELLED']).first();
    if (busy || reverseBusy) fail('Finish your current delivery first', 409);
    const changed = await trx('delivery_tasks').where({ id: taskId, status: 'AVAILABLE' }).update({ partner_id: p.id, status: 'DELIVERY_ASSIGNED' });
    if (!changed) fail('Task already assigned', 409);
    const task = await trx('delivery_tasks').where({ id: taskId }).first();
    const shipment = await trx('seller_orders').where({ id: task.seller_order_id }).first();
    await updateOrderProgress(trx, shipment.parent_order_id);
    await trx('delivery_assignments').where({ task_id: taskId, partner_id: p.id }).update({ status: 'ACCEPTED' });
    await trx('delivery_assignments').where({ task_id: taskId }).whereNot('partner_id', p.id).update({ status: 'EXPIRED' });
    await trx('audit_logs').insert({ user_id: userId, action: 'DELIVERY_ASSIGNED', metadata: JSON.stringify({ task_id: taskId }) });
    await notify(shipment.customer_id, 'PARTNER_ASSIGNED', 'Delivery partner assigned', 'A delivery partner accepted your order.', { task_id: taskId }, trx);
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
        await recordCustomerFunds(trx, order.id, due, 'COD', taskId);
      }
      await trx('seller_orders').where({ id: shipment.id }).update({ status: 'completed' });
      const unfinished = await trx('seller_orders').where({ parent_order_id: order.id }).whereNot('status', 'completed').first();
      if (!unfinished) {
        await trx('orders').where({ id: order.id }).update({ status: '3_HOUR_RETURN_WINDOW', return_window_ends_at: new Date(Date.now() + 3 * 3600000), ...(order.payment_method === 'cod' ? { payment_status: 'paid' } : {}) });
        if (order.payment_method === 'cod') await trx('payments').where({ order_id: order.id }).update({ status: 'cod_collected' });
      }
    }
    await trx('delivery_tasks').where({ id: taskId }).update({ status, ...(status === 'DELIVERED' ? { delivered_at: new Date() } : {}) });
    if (status === 'DELIVERED') await accrueDeliveryEarning(trx, { ...task, status, partner_id: p.id });
    await updateOrderProgress(trx, order.id);
    await trx('audit_logs').insert({ user_id: userId, action: status, metadata: JSON.stringify({ task_id: taskId }) });
    await notify(order.customer_id, status, status.replaceAll('_', ' '), `Your delivery is now ${status.replaceAll('_', ' ').toLowerCase()}.`, { order_id: order.id, task_id: taskId }, trx);
  });
}
export async function trackOrder(userId: string, orderId: string) {
  const order = await db('orders').where({ id: orderId, customer_id: userId }).first();
  if (!order) fail('Order not found', 404);
  const tasks = await db('delivery_tasks as t').join('seller_orders as s', 's.id', 't.seller_order_id')
    .leftJoin('delivery_partner_locations as l', 'l.partner_id', 't.partner_id').where('s.parent_order_id', orderId)
    .select('t.id', 't.status', 't.seller_order_id', 'l.latitude', 'l.longitude', 'l.updated_at');
  const reverse = await db('reverse_delivery_tasks as t').join('order_requests as r', 'r.id', 't.order_request_id').leftJoin('delivery_partner_locations as l', 'l.partner_id', 't.partner_id').where('r.order_id', orderId).select('t.id', 't.status', 't.kind', 'l.latitude', 'l.longitude', 'l.updated_at');
  return [...tasks, ...reverse].map(t => ({ ...t, ...(t.status === 'DELIVERED' || t.status === 'CANCELLED' ? { latitude: null, longitude: null, updated_at: null } : {}), stale: !t.updated_at || Date.now() - new Date(t.updated_at).getTime() > 5 * 60000 }));
}

export async function availableReverseTasks(userId: string) {
  const p = await profile(userId); if (p.status !== 'APPROVED' || !p.available) return [];
  if (await db('delivery_tasks').where({ partner_id: p.id }).whereNotIn('status', ['DELIVERED','CANCELLED']).first() || await db('reverse_delivery_tasks').where({ partner_id: p.id }).whereNotIn('status', ['DELIVERED','CANCELLED']).first()) return [];
  const location = await db('delivery_partner_locations').where({ partner_id: p.id }).first(); if (!location || Date.now() - new Date(location.updated_at).getTime() > 5 * 60000) return [];
  const radius = (await platformSettings()).matching_radius_km;
  const rows = await db('reverse_delivery_tasks').where({ status: 'AVAILABLE' });
  return rows.map(row => ({ ...row, distance_to_pickup_km: calculateHaversineDistance(Number(location.latitude), Number(location.longitude), Number(row.pickup_latitude), Number(row.pickup_longitude)) })).filter(row => row.distance_to_pickup_km <= radius);
}
export async function acceptReverseTask(userId: string, taskId: string) {
  if (!(await availableReverseTasks(userId)).some(t => t.id === taskId)) fail('Task is no longer available', 409);
  await db.transaction(async trx => { const p = await trx('delivery_partner_profiles').where({ user_id: userId, status: 'APPROVED', available: true }).forUpdate().first(); if (!p) fail('Partner unavailable', 409); const changed = await trx('reverse_delivery_tasks').where({ id: taskId, status: 'AVAILABLE' }).update({ partner_id: p.id, status: 'DELIVERY_ASSIGNED' }); if (!changed) fail('Task already assigned', 409); await trx('audit_logs').insert({ user_id: userId, action: 'REVERSE_DELIVERY_ASSIGNED', metadata: JSON.stringify({ task_id: taskId }) }); });
}
export async function progressReverseTask(userId: string, taskId: string, status: string) {
  const transitions: Record<string,string> = { DELIVERY_ASSIGNED: 'PICKED_UP', PICKED_UP: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED' };
  await db.transaction(async trx => { const p = await trx('delivery_partner_profiles').where({ user_id: userId, status: 'APPROVED' }).first(); const task = p && await trx('reverse_delivery_tasks').where({ id: taskId, partner_id: p.id }).forUpdate().first(); if (!task || transitions[task.status] !== status) fail('Invalid reverse delivery transition', 409); await trx('reverse_delivery_tasks').where({ id: task.id }).update({ status, ...(status === 'DELIVERED' ? { delivered_at: new Date() } : {}) }); if (status === 'DELIVERED') await accrueDeliveryEarning(trx, task); const request = await trx('order_requests').where({ id: task.order_request_id }).first(); const order = await trx('orders').where({ id: request.order_id }).first(); await notify(order.customer_id, `REVERSE_${status}`, `${task.kind.replaceAll('_',' ')} ${status.replaceAll('_',' ')}`, 'Your return or exchange delivery has progressed.', { order_id: order.id, task_id: task.id }, trx); await trx('audit_logs').insert({ user_id: userId, action: `REVERSE_${status}`, metadata: JSON.stringify({ task_id: task.id }) }); });
}
