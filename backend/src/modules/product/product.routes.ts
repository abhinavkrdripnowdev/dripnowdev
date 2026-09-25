import { ownsProduct } from '../../middleware/ownsProduct';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { createCategorySchema, createProductSchema, updateProductSchema, createVariantSchema, updateInventorySchema } from './product.validators';
import { Router } from 'express';
import * as controller from './product.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

/** GET /api/v1/products/categories — List all active product categories */
router.get('/categories', controller.listCategories);

/** GET /api/v1/products — Browse public products with filters */
router.get('/', controller.getPublicProducts);

/** GET /api/v1/products/:id — Get details of a single product */
router.get('/:id', controller.getProductById);

// ─── Category Admin Routes ───────────────────────────────────────────────────

/** POST /api/v1/products/categories — Create a category (Admin / Manager only) */
router.post('/categories', authenticate, authorize('manager', 'super_admin'), validate(createCategorySchema.strict()), controller.createCategory);

// ─── Seller Protected Routes ─────────────────────────────────────────────────

/** GET /api/v1/products/seller/my — List products owned by logged-in seller */
router.get('/seller/my', authenticate, authorize('seller'), controller.getSellerProducts);

/** POST /api/v1/products — Create a new product listing (Seller only) */
router.post('/', authenticate, authorize('seller'), validate(createProductSchema.strict()), controller.createProduct);

/** PUT /api/v1/products/:id — Update an existing product (Seller only) */
router.put('/:id', authenticate, authorize('seller'), ownsProduct, validate(updateProductSchema.strict()), controller.updateProduct);

/** DELETE /api/v1/products/:id — Delete a product listing (Seller only) */
router.delete('/:id', authenticate, authorize('seller'), ownsProduct, controller.deleteProduct);

/** POST /api/v1/products/:id/variants — Add a new variant to a product */
router.post('/:id/variants', authenticate, authorize('seller'), ownsProduct, validate(createVariantSchema.strict()), controller.addVariant);

/** PUT /api/v1/products/variants/:variantId/inventory — Update inventory for a variant */
router.put('/variants/:variantId/inventory', authenticate, authorize('seller'), ownsProduct, validate(updateInventorySchema.strict()), controller.updateInventory);

/** POST /api/v1/products/:id/images — Add an image to a product */
router.post('/:id/images', authenticate, authorize('seller'), ownsProduct, validate(z.object({ image_url: z.string().url(), is_primary: z.boolean().optional() }).strict()), controller.addProductImage);

export default router;
