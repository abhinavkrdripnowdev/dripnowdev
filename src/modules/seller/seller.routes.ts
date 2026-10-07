import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createSellerSchema, updateSellerSchema, addDocumentSchema, addLocationSchema } from './seller.validators';
import { Router } from 'express';
import * as controller from './seller.controller';
import { authenticate } from '../../middleware/authenticate';
import { db } from '../../config/database';
import { sendSuccess } from '../../utils/response';

const router = Router();

// All seller routes require authentication
router.use(authenticate, authorize('seller'));

/** POST /api/v1/seller/register — Submit or update seller application */
router.post('/register', validate(createSellerSchema.strict()), controller.registerSeller);

/** GET /api/v1/seller/profile — Get seller profile, documents, and store location */
router.get('/profile', controller.getMyProfile);

/** PUT /api/v1/seller/profile — Update seller profile details */
router.put('/profile', validate(updateSellerSchema.strict()), controller.updateMyProfile);

/** POST /api/v1/seller/documents — Upload/add seller document */
router.post('/documents', validate(addDocumentSchema.strict()), controller.addDocument);

/** PUT /api/v1/seller/location — Add or update store physical location */
router.put('/location', validate(addLocationSchema.strict()), controller.updateLocation);

/** GET /api/v1/seller/dashboard — Get seller dashboard overview metrics */
router.get('/dashboard', controller.getDashboardOverview);
router.get('/earnings', async (req, res) => { const seller = await db('seller_profiles').where({ user_id: req.user!.id }).first(); sendSuccess(res, seller ? await db('settlements').where({ seller_id: seller.id }).orderBy('created_at', 'desc') : []); });

export default router;
