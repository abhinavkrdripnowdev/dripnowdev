import { Router } from 'express';
import * as controller from './maps.controller';

const router = Router();

/** GET /api/v1/maps/search?q= — Location autocomplete search */
router.get('/search', controller.searchPlaces);

/** GET /api/v1/maps/reverse-geocode?lat=&lng= — Reverse geocode coordinates to formatted address */
router.get('/reverse-geocode', controller.reverseGeocode);

/** POST /api/v1/maps/distance — Calculate Haversine distance & ETA between two coordinates */
router.post('/distance', controller.calculateDistance);

export default router;
