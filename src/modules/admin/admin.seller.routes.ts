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

export default router;
