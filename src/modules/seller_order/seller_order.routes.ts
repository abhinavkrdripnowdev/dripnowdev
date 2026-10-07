import { Router } from 'express';
import * as controller from './seller_order.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { db } from '../../config/database';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.use(authenticate);
router.use(authorize('seller'));

/** GET /api/v1/seller/orders — Fetch seller orders (optional ?status=) */
router.get('/', controller.getSellerOrders);
router.get('/returns/requests', async (req, res) => { const seller = await db('seller_profiles').where({ user_id: req.user!.id }).first(); const rows = seller ? await db('order_requests as r').join('orders as o', 'o.id', 'r.order_id').join('seller_orders as s', 's.parent_order_id', 'o.id').where('s.seller_id', seller.id).select('r.*').distinct() : []; sendSuccess(res, rows); });

/** GET /api/v1/seller/orders/:id — Fetch single seller order details */
router.get('/:id', controller.getSellerOrderById);

/** PATCH /api/v1/seller/orders/:id/status — Update order status (accepted, preparing, ready_for_pickup, cancelled) */
router.patch('/:id/status', controller.updateOrderStatus);

export default router;
