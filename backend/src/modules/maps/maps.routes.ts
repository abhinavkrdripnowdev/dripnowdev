import { Router } from 'express';
import * as controller from './maps.controller';
import { db } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

/** GET /api/v1/maps/search?q= — Location autocomplete search */
router.get('/search', controller.searchPlaces);

/** GET /api/v1/maps/reverse-geocode?lat=&lng= — Reverse geocode coordinates to formatted address */
router.get('/reverse-geocode', controller.reverseGeocode);

/** POST /api/v1/maps/distance — Calculate Haversine distance & ETA between two coordinates */
router.post('/distance', controller.calculateDistance);

/** GET /api/v1/maps/stores — Approved sellers with a mapped pickup location (public) */
router.get('/stores', async (_req, res) => {
  try {
    const rows = await db('seller_profiles as s')
      .join('seller_locations as l', 'l.seller_id', 's.id')
      .where('s.status', 'approved')
      .whereNotNull('l.latitude')
      .whereNotNull('l.longitude')
      .select('s.id', 's.business_name', 'l.address_line1', 'l.city', 'l.state', 'l.postal_code', 'l.latitude', 'l.longitude');
    const counts = await db('products').where({ is_active: true, moderation_status: 'APPROVED' }).groupBy('seller_id').select('seller_id').count({ total: '*' });
    const byseller = new Map(counts.map((c: any) => [c.seller_id, Number(c.total)]));
    sendSuccess(res, rows.map((r: any) => ({ ...r, latitude: Number(r.latitude), longitude: Number(r.longitude), product_count: byseller.get(r.id) ?? 0 })));
  } catch (error: any) {
    sendError(res, error.message || 'Failed to load stores', 500);
  }
});

export default router;
