import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { fail } from '../../utils/httpError';
import { sendSuccess } from '../../utils/response';
import * as service from './delivery.service';

const router = Router();
router.use(authenticate);
router.get('/tracking/:orderId', async (req, res) => { sendSuccess(res, await service.trackOrder(req.user!.id, String(req.params.orderId))); });
router.use(authorize('delivery_partner'));
router.get('/profile', async (req, res) => { sendSuccess(res, await db('delivery_partner_profiles').where({ user_id: req.user!.id }).first() ?? null); });
router.post('/profile', async (req, res) => {
  const data = z.object({ vehicle_type: z.enum(['bicycle', 'motorcycle', 'car', 'van']), license_number: z.string().min(3).max(100), documents: z.array(z.string().url()).min(1).max(10) }).strict().parse(req.body);
  const existing = await db('delivery_partner_profiles').where({ user_id: req.user!.id }).first();
  if (existing && !['PENDING', 'REJECTED'].includes(existing.status)) fail('Application cannot be edited during approval', 409);
  const values = { vehicle_type: data.vehicle_type, license_number: data.license_number, documents_json: JSON.stringify(data.documents), status: 'PENDING', available: false };
  if (existing) await db('delivery_partner_profiles').where({ id: existing.id }).update(values);
  else await db('delivery_partner_profiles').insert({ id: randomUUID(), user_id: req.user!.id, ...values });
  sendSuccess(res, await service.profile(req.user!.id));
});
router.patch('/availability', async (req, res) => {
  const data = z.object({ available: z.boolean() }).strict().parse(req.body);
  const p = await service.profile(req.user!.id);
  if (p.status !== 'APPROVED') fail('Approval required', 403);
  await db('delivery_partner_profiles').where({ id: p.id }).update(data); sendSuccess(res, data);
});
router.put('/location', async (req, res) => {
  const data = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict().parse(req.body);
  const p = await service.profile(req.user!.id);
  if (p.status !== 'APPROVED') fail('Approval required', 403);
  await db('delivery_partner_locations').insert({ partner_id: p.id, ...data, updated_at: new Date() }).onConflict('partner_id').merge(); sendSuccess(res, data);
});
router.get('/tasks/available', async (req, res) => { sendSuccess(res, await service.availableTasks(req.user!.id)); });
router.get('/tasks', async (req, res) => {
  const p = await service.profile(req.user!.id);
  const tasks = await db('delivery_tasks as t').join('seller_orders as s', 's.id', 't.seller_order_id').join('orders as o', 'o.id', 's.parent_order_id')
    .where('t.partner_id', p.id).select('t.*', 'o.address_snapshot', 'o.payment_method', 's.total_amount');
  sendSuccess(res, tasks);
});
router.post('/tasks/:id/accept', async (req, res) => { await service.acceptTask(req.user!.id, String(req.params.id)); sendSuccess(res, null); });
router.patch('/tasks/:id/status', async (req, res) => {
  const data = z.object({ status: z.enum(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']), cash_paise: z.number().int().nonnegative().optional() }).strict().parse(req.body);
  await service.progressTask(req.user!.id, String(req.params.id), data.status, data.cash_paise); sendSuccess(res, null);
});
export default router;

export const deliveryAdminRoutes = Router();
deliveryAdminRoutes.use(authenticate, authorize('manager', 'super_admin'));
deliveryAdminRoutes.get('/partners', async (_req, res) => { sendSuccess(res, await db('delivery_partner_profiles').select('*')); });
deliveryAdminRoutes.patch('/partners/:id', async (req, res) => {
  const data = z.object({ status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED']), reason: z.string().min(3).max(1000) }).strict().parse(req.body);
  await db.transaction(async trx => {
    const p = await trx('delivery_partner_profiles').where({ id: String(req.params.id) }).forUpdate().first();
    if (!p) fail('Partner not found', 404);
    const user = await trx('users').where({ id: p.user_id }).first();
    if (data.status === 'APPROVED' && (!user.email_verified || !user.phone_verified)) fail('Email and phone verification required');
    await trx('delivery_partner_profiles').where({ id: p.id }).update({ status: data.status, review_reason: data.reason, available: false });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'DELIVERY_PARTNER_REVIEW', metadata: JSON.stringify({ partner_id: p.id, ...data }) });
  }); sendSuccess(res, null);
});
deliveryAdminRoutes.get('/cod', async (_req, res) => { sendSuccess(res, await db('cod_records').orderBy('created_at', 'desc')); });
deliveryAdminRoutes.post('/cod/:id/reconcile', async (req, res) => {
  const data = z.object({ reference: z.string().min(3).max(255) }).strict().parse(req.body);
  await db.transaction(async trx => {
    const record = await trx('cod_records').where({ id: String(req.params.id) }).forUpdate().first();
    if (!record) fail('Cash record not found', 404);
    if (record.status === 'RECONCILED') return;
    await trx('cod_reconciliations').insert({ id: randomUUID(), cod_record_id: record.id, admin_id: req.user!.id, reference: data.reference });
    await trx('cod_records').where({ id: record.id }).update({ status: 'RECONCILED' });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'COD_RECONCILED', metadata: JSON.stringify({ cod_record_id: record.id }) });
  }); sendSuccess(res, null);
});
