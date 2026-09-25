import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { LocationPicker } from '@/components/Map/LocationPicker';
import './CustomerAddressManager.css';

interface Address {
  id: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  type: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
}

export const CustomerAddressManager: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [hasLocation, setHasLocation] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: '',
    state: '',
    postal_code: '',
    type: 'home',
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/addresses');
      if (res.data.success) {
        setAddresses(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch addresses', err);
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
    if (!hasLocation) { setError('Choose and confirm a map location first'); return; }
    try {
      const res = editingId ? await api.put(`/customer/addresses/${editingId}`, formData) : await api.post('/customer/addresses', formData);
      if (res.data.success) {
        setIsAdding(false); setEditingId(''); setError('');
        fetchAddresses();
      }
    } catch (err) {
      setError('Unable to save address. Please check the details.');
    }
  };

  const setDefault = async (id: string) => {
    try {
      await api.patch(`/customer/addresses/${id}/default`);
      fetchAddresses();
    } catch (err) {
      console.error('Failed to set default address', err);
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      await api.delete(`/customer/addresses/${id}`);
      fetchAddresses();
    } catch (err) {
      console.error('Failed to delete address', err);
    }
  };

  if (loading) return <div>Loading addresses...</div>;

  return (
    <div className="address-manager">
      {error && <p role="alert">{error}</p>}
      <div className="address-header">
        <h2 className="deal-title">Manage Addresses</h2>
        {!isAdding && (
          <button className="add-address-btn" onClick={() => { setEditingId(''); setHasLocation(false); setFormData({ address_line1: '', address_line2: '', landmark: '', city: '', state: '', postal_code: '', type: 'home', latitude: 0, longitude: 0 }); setIsAdding(true); }}>
            + Add New Address
          </button>
        )}
      </div>

      {isAdding ? (
        <form className="address-form" onSubmit={handleSubmit}>
          <h3 className="address-form-title">Add New Address</h3>
          
          <div className="map-picker-section">
            <label>Pinpoint your exact location</label>
            <LocationPicker initialLat={editingId ? formData.latitude : undefined} initialLng={editingId ? formData.longitude : undefined} onLocationSelect={handleLocationSelect} onLocationPending={() => setHasLocation(false)} />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Address Line 1 / Flat No.</label>
              <input
                required
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Address Line 2 (Optional)</label>
              <input
                type="text"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Landmark</label>
              <input
                type="text"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>City</label>
              <input
                required
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                required
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Postal Code</label>
              <input
                required
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Address Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="save-btn">Save Address</button>
          </div>
        </form>
      ) : (
        <div className="address-list">
          {addresses.length === 0 ? (
            <div className="no-address">No addresses found. Add one to checkout smoothly.</div>
          ) : (
            addresses.map((addr) => (
              <div key={addr.id} className={`address-card ${addr.is_default ? 'default' : ''}`}>
                <div className="address-card-header">
                  <span className="address-type">{addr.type.toUpperCase()}</span>
                  {addr.is_default && <span className="default-badge">Default</span>}
                </div>
                <div className="address-body">
                  <p className="addr-line">{addr.address_line1}</p>
                  {addr.address_line2 && <p className="addr-line">{addr.address_line2}</p>}
                  {addr.landmark && <p className="addr-line">Near: {addr.landmark}</p>}
                  <p className="addr-city">{addr.city}, {addr.state} - {addr.postal_code}</p>
                </div>
                <div className="address-actions">
                  {!addr.is_default && (
                    <button className="action-btn make-default" onClick={() => setDefault(addr.id)}>
                      Set as Default
                    </button>
                  )}
                  <button className="action-btn" onClick={() => { setEditingId(addr.id); setHasLocation(addr.latitude != null && addr.longitude != null); setFormData({ address_line1: addr.address_line1, address_line2: addr.address_line2 || '', landmark: addr.landmark || '', city: addr.city, state: addr.state, postal_code: addr.postal_code, type: addr.type, latitude: Number(addr.latitude ?? 0), longitude: Number(addr.longitude ?? 0) }); setIsAdding(true); }}>Edit</button>
                  <button className="action-btn delete" onClick={() => deleteAddress(addr.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
