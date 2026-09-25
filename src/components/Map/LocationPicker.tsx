import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '@/lib/api';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';

// Fix Leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationPending?: () => void;
  onLocationSelect: (lat: number, lng: number, addressDetails: any) => void;
}

const defaultCenter: [number, number] = [28.6139, 77.2090]; // New Delhi

function DraggableMarker({
  position,
  setPosition,
  onDragEnd,
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const map = useMap();

  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onDragEnd(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return (
    <Marker
      draggable
      position={position}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;
          if (marker != null) {
            const latlng = marker.getLatLng();
            setPosition([latlng.lat, latlng.lng]);
            onDragEnd(latlng.lat, latlng.lng);
          }
        },
      }}
    ></Marker>
  );
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLat,
  initialLng,
  onLocationSelect,
  onLocationPending,
}) => {
  const [position, setPosition] = useState<[number, number]>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : defaultCenter
  );
  const [address, setAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      handleReverseGeocode(initialLat, initialLng);
    } else {
      // Try HTML5 Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setPosition([latitude, longitude]);
            handleReverseGeocode(latitude, longitude);
          },
          (err) => {
            console.error('Geolocation error:', err);
            handleReverseGeocode(position[0], position[1]);
          }
        );
      } else {
        handleReverseGeocode(position[0], position[1]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReverseGeocode = async (lat: number, lng: number) => {
    onLocationPending?.();
    try {
      setLoading(true);
      const res = await api.get(`/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.data.success && res.data.data) {
        const details = res.data.data;
        setAddress(details.formatted_address || '');
        onLocationSelect(lat, lng, details);
      }
    } catch (err) {
      setAddress('Unable to resolve this location. Move the pin or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery;
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await api.get(`/maps/search?q=${encodeURIComponent(query)}`);
      if (res.data.success) {
        setSuggestions(res.data.data);
      }
    } catch (err) {
      console.error('Failed to search places', err);
    }
  };

  const handleSelectPlace = (place: any) => {
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    setPosition([lat, lng]);
    setSearchQuery('');
    setSuggestions([]);
    handleReverseGeocode(lat, lng);
  };

  return (
    <div className="location-picker">
      <div className="location-search-box">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSearch(); } }}
          placeholder="Search for an area, street, or landmark..."
          className="location-search-input"
        />
        <button type="button" onClick={() => void handleSearch()}>Search location</button>
        {suggestions.length > 0 && (
          <ul className="location-suggestions">
            {suggestions.map((s) => (
              <li key={s.place_id} onClick={() => handleSelectPlace(s)}>
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="map-container-wrapper">
        <MapContainer center={position} zoom={15} style={{ height: '300px', width: '100%', borderRadius: '8px' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterer position={position} />
          <DraggableMarker position={position} setPosition={setPosition} onDragEnd={handleReverseGeocode} />
        </MapContainer>
      </div>

      <div className="location-details">
        {loading ? <p>Loading address...</p> : <p><strong>Selected Address:</strong> {address}</p>}
        <p className="location-help-text">Drag the pin to adjust your exact location.</p>
      </div>
    </div>
  );
};

function MapCenterer({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, map.getZoom());
  }, [position, map]);
  return null;
}
