import { Router } from 'express';
import * as controller from './seller_order.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('seller'));

/** GET /api/v1/seller/orders — Fetch seller orders (optional ?status=) */
router.get('/', controller.getSellerOrders);

/** GET /api/v1/seller/orders/:id — Fetch single seller order details */
router.get('/:id', controller.getSellerOrderById);

/** PATCH /api/v1/seller/orders/:id/status — Update order status (accepted, preparing, ready_for_pickup, cancelled) */
router.patch('/:id/status', controller.updateOrderStatus);

export default router;
