import { Request, Response } from 'express';
import { sendSuccess, sendError, sendBadRequest } from '../../utils/response';
import * as geocodingService from '../../integrations/maps/geocoding';
import * as placesService from '../../integrations/maps/places';
import * as distanceService from '../../integrations/maps/distance';

export async function searchPlaces(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string) || '';
    if (!query.trim()) {
      sendBadRequest(res, 'Query parameter "q" is required');
      return;
    }

    const suggestions = await placesService.searchPlaces(query);
    sendSuccess(res, suggestions);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to search places');
  }
}

export async function reverseGeocode(req: Request, res: Response): Promise<void> {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : NaN;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : NaN;

    if (isNaN(lat) || isNaN(lng)) {
      sendBadRequest(res, 'Valid "lat" and "lng" query parameters are required');
      return;
    }

    const result = await geocodingService.reverseGeocode(lat, lng);
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to reverse geocode location');
  }
}

export async function calculateDistance(req: Request, res: Response): Promise<void> {
  try {
    const { origin_lat, origin_lng, destination_lat, destination_lng, speed_kmh } = req.body;

    if (
      origin_lat === undefined ||
      origin_lng === undefined ||
      destination_lat === undefined ||
      destination_lng === undefined
    ) {
      sendBadRequest(res, 'origin_lat, origin_lng, destination_lat, and destination_lng are required');
      return;
    }

    const result = distanceService.calculateDistance(
      Number(origin_lat),
      Number(origin_lng),
      Number(destination_lat),
      Number(destination_lng),
      speed_kmh ? Number(speed_kmh) : 30
    );

    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to calculate distance');
  }
}
