import { platformSettings } from '../../services/settings.service';
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { authorizePermission } from '../../middleware/authorizePermission';
import { fail } from '../../utils/httpError';
import { sendSuccess } from '../../utils/response';

const router = Router();
router.use(authenticate, authorize('manager', 'super_admin'), authorizePermission('admin:manage_users'));
router.get('/users', async (_req, res) => { sendSuccess(res, await db('users').select('id', 'full_name', 'email', 'status', 'account_status').limit(200)); });
router.get('/orders', async (_req, res) => { sendSuccess(res, await db('orders').orderBy('created_at', 'desc').limit(200)); });
router.get('/audit', async (_req, res) => { sendSuccess(res, await db('audit_logs').orderBy('created_at', 'desc').limit(200)); });
router.get('/security-events', async (_req, res) => { sendSuccess(res, await db('security_events').orderBy('created_at', 'desc').limit(200)); });
router.patch('/users/:id/status', async (req, res) => {
  const data = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED']), reason: z.string().min(3).max(1000) }).strict().parse(req.body);
  const id = z.string().uuid().parse(req.params.id);
  if (id === req.user!.id) fail('Cannot modify your own account status', 403);
  await db.transaction(async trx => {
    const user = await trx('users').where({ id }).forUpdate().first();
    if (!user) fail('Account not found', 404);
    if (await trx('user_roles').where({ user_id: id }).whereIn('role_id', [4, 5]).first()) fail('Privileged account status requires an operator review', 403);
    if (data.status === 'APPROVED' && (!user.email_verified || !user.phone_verified)) fail('Both verification steps are required');
    await trx('users').where({ id }).update({ account_status: data.status, status: data.status === 'APPROVED' ? 'active' : data.status === 'PENDING' ? 'pending_verification' : 'suspended' });
    await trx('sessions').where({ user_id: id }).update({ revoked: true });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'ACCOUNT_STATUS_CHANGED', metadata: JSON.stringify({ target: id, ...data }) });
  }); sendSuccess(res, null);
});
router.get('/admin-requests', async (_req, res) => { sendSuccess(res, await db('admin_creation_requests').orderBy('created_at', 'desc')); });
router.post('/admin-requests', async (req, res) => {
  const { user_id } = z.object({ user_id: z.string().uuid() }).strict().parse(req.body);
  if (user_id === req.user!.id) fail('Self promotion is forbidden', 403);
  const target = await db('users').where({ id: user_id, status: 'active', email_verified: true, phone_verified: true }).first();
  if (!target) fail('A verified active account is required');
  if (await db('user_roles').where({ user_id }).whereIn('role_id', [4, 5]).first()) fail('Account is already privileged');
  const id = randomUUID();
  await db('admin_creation_requests').insert({ id, target_user_id: user_id, requested_by: req.user!.id });
  sendSuccess(res, { id, status: 'PENDING', required_approvals: 2 });
});
router.post('/admin-requests/:id/approve', async (req, res) => {
  await db.transaction(async trx => {
    const request = await trx('admin_creation_requests').where({ id: String(req.params.id) }).forUpdate().first();
    if (!request || request.status !== 'PENDING') fail('Pending request not found', 404);
    if (request.target_user_id === req.user!.id) fail('Self approval forbidden', 403);
    await trx('admin_creation_approvals').insert({ request_id: request.id, admin_id: req.user!.id }).onConflict(['request_id', 'admin_id']).ignore();
    const approvals = await trx('admin_creation_approvals as a').join('users as u', 'u.id', 'a.admin_id')
      .join('user_roles as r', 'r.user_id', 'u.id').where('a.request_id', request.id).where('u.status', 'active').whereIn('r.role_id', [4, 5]).distinct('a.admin_id');
    if (approvals.length >= 2) {
      const target = await trx('users').where({ id: request.target_user_id, status: 'active', email_verified: true, phone_verified: true }).first();
      if (!target) fail('Target account is no longer eligible', 409);
      await trx('user_roles').insert({ user_id: request.target_user_id, role_id: 4, granted_by: req.user!.id }).onConflict(['user_id', 'role_id']).ignore();
      await trx('admin_creation_requests').where({ id: request.id }).update({ status: 'APPROVED' });
      await trx('sessions').where({ user_id: request.target_user_id }).update({ revoked: true });
    }
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'ADMIN_CREATION_APPROVAL', metadata: JSON.stringify({ request_id: request.id, approvals: approvals.length }) });
  }); sendSuccess(res, null);
});
router.get('/settings', authorize('super_admin'), async (_req, res) => { sendSuccess(res, await platformSettings()); });
router.patch('/settings', authorize('super_admin'), async (req, res) => {
  const data = z.object({ delivery_base_paise: z.number().int().min(0).max(100000), delivery_per_km_paise: z.number().int().min(0).max(10000), delivery_free_km: z.number().min(0).max(100), partner_base_paise: z.number().int().min(0).max(100000), partner_per_km_paise: z.number().int().min(0).max(10000), matching_radius_km: z.number().min(0.1).max(100), tax_basis_points: z.number().int().min(0).max(10000), platform_fee_paise: z.number().int().min(0).max(100000) }).partial().strict().parse(req.body);
  await db.transaction(async trx => {
    for (const [key, value] of Object.entries(data)) await trx('platform_settings').where({ key }).update({ value });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'PLATFORM_PRICING_UPDATED', metadata: JSON.stringify(data) });
  }); sendSuccess(res, await platformSettings());
});
export default router;
