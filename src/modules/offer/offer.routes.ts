import { Router } from 'express';
import * as controller from './offer.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

/** GET /api/v1/offers/code/:code — Validate and fetch coupon offer details by code */
router.get('/code/:code', controller.getOfferByCode);

// Protected routes for sellers
router.use(authenticate);

/** GET /api/v1/offers/seller — List all offers/coupons created by logged-in seller */
router.get('/seller', authorize('seller'), controller.getSellerOffers);

/** POST /api/v1/offers — Create a new percentage, flat, or special price offer/coupon */
router.post('/', authorize('seller'), controller.createOffer);

/** GET /api/v1/offers/combo/seller — List combo offers created by logged-in seller */
router.get('/combo/seller', authorize('seller'), controller.getSellerComboOffers);

/** POST /api/v1/offers/combo — Create a new combo offer (multi-product bundle) */
router.post('/combo', authorize('seller'), controller.createComboOffer);

export default router;
