import axios from 'axios';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'DripNow-Marketplace/1.0',
      },
      timeout: 5000,
    });

    if (response.data && response.data.length > 0) {
      const item = response.data[0];
      return {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        formatted_address: item.display_name,
      };
    }
  } catch (err) {
    // Fallback if network/offline
  }

  // Fallback mock coordinates (e.g., Connaught Place, New Delhi)
  return {
    latitude: 28.6315,
    longitude: 77.2167,
    formatted_address: `${address}, New Delhi, Delhi, India`,
    city: 'New Delhi',
    state: 'Delhi',
    postal_code: '110001',
    country: 'India',
  };
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'DripNow-Marketplace/1.0',
      },
      timeout: 5000,
    });

    if (response.data && response.data.display_name) {
      const addr = response.data.address || {};
      return {
        latitude,
        longitude,
        formatted_address: response.data.display_name,
        city: addr.city || addr.town || addr.village || addr.suburb || 'New Delhi',
        state: addr.state || 'Delhi',
        postal_code: addr.postcode || '110001',
        country: addr.country || 'India',
      };
    }
  } catch (err) {
    // Fallback if offline
  }

  return {
    latitude,
    longitude,
    formatted_address: `Lat: ${latitude}, Lng: ${longitude}, Connaught Place, New Delhi, Delhi 110001`,
    city: 'New Delhi',
    state: 'Delhi',
    postal_code: '110001',
    country: 'India',
  };
}
