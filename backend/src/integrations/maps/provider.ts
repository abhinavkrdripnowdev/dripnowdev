import axios from 'axios';
import { fail } from '../../utils/httpError';
// Explicit search only. Public Nominatim is rate limited and must not power autocomplete.
let pending: Promise<unknown> = Promise.resolve();
let lastCall = 0;
const cache = new Map<string, { expires: number; data: any }>();
export async function mapRequest(endpoint: string, params: Record<string, string | number>) {
  if ((process.env.MAPS_PROVIDER || 'google') === 'google') return googleRequest(endpoint, params);
  if (!process.env.MAPS_GEOCODING_URL) fail('Configure a geocoding provider before searching locations', 503);
  const key = endpoint + JSON.stringify(params);
  const cached = cache.get(key); if (cached && cached.expires > Date.now()) return cached.data;
  const run = pending.catch(() => {}).then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastCall));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    lastCall = Date.now();
    try {
      const response = await axios.get(`${process.env.MAPS_GEOCODING_URL}/${endpoint}`, {
        params: { format: 'json', ...params }, headers: { 'User-Agent': process.env.MAPS_USER_AGENT || 'DripNow/1.0 (location search)' }, timeout: 8000,
      });
      if (cache.size > 1000) cache.clear();
      cache.set(key, { expires: Date.now() + 3600000, data: response.data }); return response.data;
    } catch { fail('Map provider unavailable. Please try again.', 503); }
  });
  pending = run; return run;
}

async function googleRequest(endpoint: string, params: Record<string, string | number>) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) fail('Google Maps is not configured. Set GOOGLE_MAPS_API_KEY on the server.', 503);
  let data: any;
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { key: apiKey, language: 'en', ...(endpoint === 'reverse'
        ? { latlng: `${params.lat},${params.lon}` }
        : { address: params.q, components: 'country:IN' }) },
      timeout: 8000,
    });
    data = response.data;
  } catch { fail('Google Maps is temporarily unavailable. Please try again.', 503); }
  if (data.status === 'ZERO_RESULTS') return endpoint === 'reverse' ? null : [];
  if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'OVER_DAILY_LIMIT') fail('Google Maps quota exceeded. Please try again later.', 503);
  if (data.status !== 'OK' || !Array.isArray(data.results)) fail('Google Maps request failed. Check the server key, enabled API and billing.', 503);
  const rows = data.results.map((result: any) => {
    const component = (type: string) => result.address_components?.find((part: any) => part.types?.includes(type))?.long_name;
    return {
      place_id: result.place_id, display_name: result.formatted_address,
      lat: result.geometry.location.lat, lon: result.geometry.location.lng,
      type: result.types?.[0],
      address: { city: component('locality') || component('administrative_area_level_2'), state: component('administrative_area_level_1'), postcode: component('postal_code'), country: component('country') },
    };
  });
  return endpoint === 'reverse' ? rows[0] : rows.slice(0, Number(params.limit || 5));
}
