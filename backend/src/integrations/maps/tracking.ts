import { calculateDistance, DistanceCalculationResult } from './distance';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export function isLocationWithinRadius(
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): boolean {
  const result = calculateDistance(originLat, originLon, targetLat, targetLon);
  return result.distance_meters <= radiusMeters;
}

export function calculateEta(
  currentLocation: LocationPoint,
  destination: LocationPoint,
  speedKmH = 30
): DistanceCalculationResult {
  return calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    destination.latitude,
    destination.longitude,
    speedKmH
  );
}
