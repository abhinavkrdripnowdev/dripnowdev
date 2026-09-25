import { authorizePermission } from '../../middleware/authorizePermission';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as orderController from './order.controller';

const router = Router();

router.use(authenticate, authorizePermission('place:orders'));

router.post('/quote', orderController.quote);
router.post('/checkout', orderController.checkout);
router.get('/', orderController.getCustomerOrders);
router.get('/:orderId', orderController.getOrderDetails);
router.post('/:orderId/cancel', orderController.cancelOrder);

export default router;
