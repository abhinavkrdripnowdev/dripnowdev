import { Router } from 'express';
import * as controller from './customer.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

/** GET /api/v1/customer/profile — Get customer profile settings and default address */
router.get('/profile', controller.getProfile);

/** PUT /api/v1/customer/profile — Update customer full name / avatar */
router.put('/profile', controller.updateProfile);

/** GET /api/v1/customer/addresses — List all saved customer delivery addresses */
router.get('/addresses', controller.getAddresses);

/** POST /api/v1/customer/addresses — Add a new delivery address */
router.post('/addresses', controller.createAddress);

/** PUT /api/v1/customer/addresses/:id — Update an existing address */
router.put('/addresses/:id', controller.updateAddress);

/** DELETE /api/v1/customer/addresses/:id — Delete an address */
router.delete('/addresses/:id', controller.deleteAddress);

/** PATCH /api/v1/customer/addresses/:id/default — Set an address as default */
router.patch('/addresses/:id/default', controller.setDefaultAddress);

/** GET /api/v1/customer/wishlist — Get customer wishlist */
router.get('/wishlist', controller.getWishlist);

/** POST /api/v1/customer/wishlist — Add product to wishlist */
router.post('/wishlist', controller.addToWishlist);

/** DELETE /api/v1/customer/wishlist/:productId — Remove product from wishlist */
router.delete('/wishlist/:productId', controller.removeFromWishlist);

export default router;
