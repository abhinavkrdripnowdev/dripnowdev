import { mapRequest } from './provider';
import { fail } from '../../utils/httpError';
export interface GeocodeResult { latitude: number; longitude: number; formatted_address: string; city?: string; state?: string; postal_code?: string; country?: string; }
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const rows = await mapRequest('search', { q: address, limit: 1 });
  if (!rows?.length) fail('Address not found', 404);
  return { latitude: Number(rows[0].lat), longitude: Number(rows[0].lon), formatted_address: rows[0].display_name };
}
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) fail('Invalid coordinates');
  const row = await mapRequest('reverse', { lat: latitude, lon: longitude });
  if (!row?.display_name) fail('Address not found for this location', 404);
  const a = row.address || {};
  return { latitude, longitude, formatted_address: row.display_name, city: a.city || a.town || a.village || a.suburb, state: a.state, postal_code: a.postcode, country: a.country };
}
