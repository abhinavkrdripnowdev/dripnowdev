import { authorizePermission } from '../../middleware/authorizePermission';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as cartController from './cart.controller';

const router = Router();

router.use(authenticate, authorizePermission('place:orders'));

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:itemId', cartController.updateCartItem);
router.delete('/', cartController.clearCart);

export default router;
