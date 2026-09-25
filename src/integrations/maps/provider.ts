import axios from 'axios';
import { fail } from '../../utils/httpError';
// Explicit search only. Public Nominatim is rate limited and must not power autocomplete.
let pending: Promise<unknown> = Promise.resolve();
let lastCall = 0;
const cache = new Map<string, { expires: number; data: any }>();
export async function mapRequest(endpoint: string, params: Record<string, string | number>) {
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
