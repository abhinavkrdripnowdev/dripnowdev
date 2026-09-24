export interface DistanceCalculationResult {
  distance_km: number;
  distance_meters: number;
  estimated_duration_minutes: number;
}

/**
  * Calculate exact Haversine distance in kilometers between two geo coordinates
  */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  averageSpeedKmH = 30 // Default 30 km/h urban speed
): DistanceCalculationResult {
  const distanceKm = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  const distanceMeters = Math.round(distanceKm * 1000);
  const durationHours = distanceKm / averageSpeedKmH;
  const estimatedDurationMinutes = Math.max(5, Math.ceil(durationHours * 60)); // Minimum 5 mins

  return {
    distance_km: distanceKm,
    distance_meters: distanceMeters,
    estimated_duration_minutes: estimatedDurationMinutes,
  };
}
