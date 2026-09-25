import React, { useState, useEffect } from 'react';
import { LocationPicker } from '@/components/Map/LocationPicker';
import api from '@/lib/api';

interface SellerLocation {
  id?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
}

export const SellerLocationManager: React.FC = () => {
  const [location, setLocation] = useState<SellerLocation | null>(null);
  const [error, setError] = useState('');
  const [hasLocation, setHasLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SellerLocation>({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      const res = await api.get('/seller/profile');
      if (res.data.success && res.data.data.location) {
        setHasLocation(true);
        setLocation(res.data.data.location);
        setFormData(res.data.data.location);
      }
    } catch (err) {
      console.error('Failed to fetch seller location', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number, details: any) => {
    setHasLocation(true);
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address_line1: details.formatted_address || prev.address_line1,
      city: details.city || prev.city,
      state: details.state || prev.state,
      postal_code: details.postal_code || prev.postal_code,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasLocation) { setError('Select and confirm a map location first'); return; }
    try {
      const res = await api.put('/seller/location', { address_line1: formData.address_line1, address_line2: formData.address_line2 || undefined, city: formData.city, state: formData.state, postal_code: formData.postal_code, latitude: Number(formData.latitude), longitude: Number(formData.longitude) });
      if (res.data.success) {
        setLocation(res.data.data);
        setIsEditing(false);
      }
    } catch (err) {
      setError('Unable to save pickup location. Check your profile and address details.');
    }
  };

  if (loading) return <div>Loading location...</div>;

  return (
    <div style={{ padding: 24, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      {error && <p role="alert">{error}</p>}
      <h2 style={{ marginBottom: 16 }}>Pickup Location (Warehouse)</h2>
      <p style={{ color: '#64748b', marginBottom: 24 }}>Set the precise location from where DripNow delivery partners will pick up your orders.</p>

      {!isEditing && location ? (
        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{location.address_line1}</strong>
              {location.address_line2 && <div>{location.address_line2}</div>}
              <div>{location.city}, {location.state} - {location.postal_code}</div>
              {location.latitude && location.longitude && (
                <div style={{ color: '#2874f0', fontSize: '0.85rem', marginTop: 8 }}>
                  Coordinates: {location.latitude}, {location.longitude}
                </div>
              )}
            </div>
            <button className="dash-btn dash-btn--primary" onClick={() => setIsEditing(true)}>
              Edit Location
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Pinpoint on Map</label>
            <LocationPicker 
              initialLat={location?.latitude} 
              initialLng={location?.longitude} 
              onLocationSelect={handleLocationSelect} onLocationPending={() => setHasLocation(false)} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label>Address Line 1</label>
              <input 
                required 
                type="text" 
                value={formData.address_line1} 
                onChange={e => setFormData({...formData, address_line1: e.target.value})}
                style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 4 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label>Address Line 2 (Optional)</label>
              <input 
                type="text" 
                value={formData.address_line2} 
                onChange={e => setFormData({...formData, address_line2: e.target.value})}
                style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 4 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label>City</label>
              <input 
                required 
                type="text" 
                value={formData.city} 
                onChange={e => setFormData({...formData, city: e.target.value})}
                style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 4 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label>State</label>
              <input 
                required 
                type="text" 
                value={formData.state} 
                onChange={e => setFormData({...formData, state: e.target.value})}
                style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 4 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label>Postal Code</label>
              <input 
                required 
                type="text" 
                value={formData.postal_code} 
                onChange={e => setFormData({...formData, postal_code: e.target.value})}
                style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 4 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {location && (
              <button type="button" className="dash-btn dash-btn--ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            )}
            <button type="submit" className="dash-btn dash-btn--primary">
              Save Location
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
