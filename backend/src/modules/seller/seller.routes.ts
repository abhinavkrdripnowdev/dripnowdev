import { Router } from 'express';
import * as controller from './seller.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// All seller routes require authentication
router.use(authenticate);

/** POST /api/v1/seller/register — Submit or update seller application */
router.post('/register', controller.registerSeller);

/** GET /api/v1/seller/profile — Get seller profile, documents, and store location */
router.get('/profile', controller.getMyProfile);

/** PUT /api/v1/seller/profile — Update seller profile details */
router.put('/profile', controller.updateMyProfile);

/** POST /api/v1/seller/documents — Upload/add seller document */
router.post('/documents', controller.addDocument);

/** PUT /api/v1/seller/location — Add or update store physical location */
router.put('/location', controller.updateLocation);

/** GET /api/v1/seller/dashboard — Get seller dashboard overview metrics */
router.get('/dashboard', controller.getDashboardOverview);

export default router;
