import { db } from '../../config/database';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response';
import { fail } from '../../utils/httpError';
import { Router } from 'express';
import * as controller from './admin.seller.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('manager', 'super_admin'));

/** GET /api/v1/admin/sellers — List seller applications (filter by ?status=pending|approved|rejected) */
router.get('/', controller.listSellers);

/** GET /api/v1/admin/sellers/:id — View seller application details & documents */
router.get('/:id', controller.getSellerDetails);

/** POST /api/v1/admin/sellers/:id/approve — Approve seller application & grant seller role */
router.post('/:id/approve', controller.approveSeller);

/** POST /api/v1/admin/sellers/:id/reject — Reject seller application with reason */
router.post('/:id/reject', controller.rejectSeller);

router.post('/:id/suspend', async (req, res) => {
  const { reason } = z.object({ reason: z.string().min(3).max(1000) }).strict().parse(req.body);
  await db.transaction(async trx => {
    const seller = await trx('seller_profiles').where({ id: String(req.params.id) }).first();
    if (!seller) fail('Seller not found', 404);
    await trx('seller_profiles').where({ id: seller.id }).update({ status: 'suspended', rejection_reason: reason });
    await trx('audit_logs').insert({ user_id: req.user!.id, action: 'SELLER_SUSPENDED', metadata: JSON.stringify({ seller_id: seller.id, reason }) });
  });
  sendSuccess(res, null);
});
export default router;
