import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '@/lib/api';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface Store {
  id: string;
  business_name: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  product_count: number;
}

const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];

const km = (a: [number, number], b: [number, number]) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.8 }); }, [target, map]);
  return null;
}

export const StoresMap: React.FC<{ onShopStore: (store: Store) => void }> = ({ onShopStore }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState<[number, number] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [fly, setFly] = useState<[number, number] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/maps/stores')
      .then((r) => setStores(r.data.data ?? []))
      .catch(() => setError('Unable to load stores right now.'))
      .finally(() => setLoading(false));
  }, []);

  const locate = () => {
    if (!navigator.geolocation) { setError('Location is not supported by this browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { const pos: [number, number] = [p.coords.latitude, p.coords.longitude]; setMe(pos); setFly(pos); setError(''); },
      () => setError('Location permission was denied. You can still browse all stores.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores
      .filter((s) => !q || `${s.business_name} ${s.city} ${s.postal_code}`.toLowerCase().includes(q))
      .map((s) => ({ ...s, distance: me ? km(me, [s.latitude, s.longitude]) : null }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [stores, me, query]);

  const center = me ?? (stores[0] ? [stores[0].latitude, stores[0].longitude] as [number, number] : DEFAULT_CENTER);

  const pick = (s: Store) => { setSelected(s.id); setFly([s.latitude, s.longitude]); };

  return (
    <section className="stores-page">
      <header className="stores-head">
        <div>
          <span className="section-kicker">STORES NEAR YOU</span>
          <h2 className="deal-title">Shop from local sellers</h2>
          <p>Every pin is an approved DripNow seller who can deliver to you fast.</p>
        </div>
        <button className="sl-btn sl-btn--dark" onClick={locate}>◎ Use my location</button>
      </header>
      {error && <div className="stores-note" role="alert">{error}</div>}
      <div className="stores-layout">
        <aside className="stores-list">
          <input className="stores-search" placeholder="Search by store, city or pincode" value={query} onChange={(e) => setQuery(e.target.value)} />
          {loading && <p className="stores-empty">Loading stores…</p>}
          {!loading && list.length === 0 && <p className="stores-empty">{stores.length ? 'No stores match your search.' : 'No sellers have published a store location yet.'}</p>}
          {list.map((s) => (
            <article key={s.id} className={`store-card ${selected === s.id ? 'is-selected' : ''}`} onClick={() => pick(s)}>
              <div className="store-card__top"><h3>{s.business_name}</h3>{s.distance != null && <em>{s.distance < 1 ? `${Math.round(s.distance * 1000)} m` : `${s.distance.toFixed(1)} km`}</em>}</div>
              <p>{s.address_line1}, {s.city} {s.postal_code}</p>
              <div className="store-card__foot"><span>{s.product_count} product{s.product_count === 1 ? '' : 's'}</span><button onClick={(e) => { e.stopPropagation(); onShopStore(s); }}>Shop this store →</button></div>
            </article>
          ))}
        </aside>
        <div className="stores-map">
          <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FlyTo target={fly} />
            {me && <CircleMarker center={me} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}><Popup>You are here</Popup></CircleMarker>}
            {list.map((s) => (
              <Marker key={s.id} position={[s.latitude, s.longitude]} eventHandlers={{ click: () => setSelected(s.id) }}>
                <Popup><strong>{s.business_name}</strong><br />{s.address_line1}, {s.city}<br /><a href="#shop" onClick={(e) => { e.preventDefault(); onShopStore(s); }}>Shop this store →</a></Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </section>
  );
};
