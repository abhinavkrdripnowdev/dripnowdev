import axios from 'axios';

export interface PlaceSuggestion {
  place_id: string;
  display_name: string;
  latitude: number;
  longitude: number;
  type?: string;
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'DripNow-Marketplace/1.0',
      },
      timeout: 5000,
    });

    if (response.data && Array.isArray(response.data)) {
      return response.data.map((item: any) => ({
        place_id: String(item.place_id),
        display_name: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type,
      }));
    }
  } catch (err) {
    // Fallback if offline
  }

  // Mock search suggestions for fallback
  const qLower = query.toLowerCase();
  const mockPlaces: PlaceSuggestion[] = [
    {
      place_id: 'mock_1',
      display_name: 'Connaught Place, Central Delhi, New Delhi, Delhi, 110001',
      latitude: 28.6315,
      longitude: 77.2167,
      type: 'commercial',
    },
    {
      place_id: 'mock_2',
      display_name: 'Cyber City, Phase 2, Gurugram, Haryana, 122002',
      latitude: 28.495,
      longitude: 77.0895,
      type: 'business_park',
    },
    {
      place_id: 'mock_3',
      display_name: 'Indiranagar 100 Feet Road, Bengaluru, Karnataka, 560038',
      latitude: 12.9784,
      longitude: 77.6408,
      type: 'residential',
    },
  ];

  return mockPlaces.filter((p) => p.display_name.toLowerCase().includes(qLower));
}
