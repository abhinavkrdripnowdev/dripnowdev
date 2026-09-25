import { mapRequest } from './provider';
export interface PlaceSuggestion { place_id: string; display_name: string; latitude: number; longitude: number; type?: string; }
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3 || query.length > 255) return [];
  const rows = await mapRequest('search', { q: query, limit: 5, countrycodes: 'in' });
  return rows.map((r: any) => ({ place_id: String(r.place_id), display_name: r.display_name, latitude: Number(r.lat), longitude: Number(r.lon), type: r.type }));
}
