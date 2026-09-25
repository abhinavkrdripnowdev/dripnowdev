import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import api from '@/lib/api';
import 'leaflet/dist/leaflet.css';
function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap(); useEffect(() => { map.setView([latitude, longitude], 14); }, [map, latitude, longitude]); return null;
}
export function OrderTracking({ orderId }: { orderId: string }) {
  const [tasks, setTasks] = useState<any[]>([]); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() { try { const result = await api.get(`/delivery/tracking/${orderId}`); if (active) { setTasks(result.data.data); setError(''); } } catch { if (active) setError('Tracking is temporarily unavailable'); } }
    void load(); const interval = setInterval(load, 10000); return () => { active = false; clearInterval(interval); };
  }, [orderId]);
  return <section><h3>Delivery tracking</h3>{error && <p role="alert">{error}</p>}{!tasks.length && <p>Waiting for a delivery partner assignment.</p>}
    {tasks.map(t => <div key={t.id}><p>{t.status.replaceAll('_', ' ')}{t.latitude != null && t.stale ? ' · Location is outdated' : ''}</p>
      {t.latitude != null && t.longitude != null && <MapContainer center={[Number(t.latitude), Number(t.longitude)]} zoom={14} style={{ height: 260, width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Recenter latitude={Number(t.latitude)} longitude={Number(t.longitude)} />
        <CircleMarker center={[Number(t.latitude), Number(t.longitude)]} radius={9}><Popup>Latest partner location</Popup></CircleMarker>
      </MapContainer>}
    </div>)}
  </section>;
}
