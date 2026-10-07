import { useEffect, useRef, useState } from 'react';

let loader: Promise<any> | undefined;
function loadMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
  if (!key) return Promise.reject(new Error('Google map is not configured yet.'));
  if (!loader) loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.async = true;
    script.onload = () => resolve((window as any).google.maps);
    script.onerror = () => { loader = undefined; reject(new Error('Unable to load Google Maps.')); };
    document.head.appendChild(script);
  });
  return loader;
}

export function GoogleLocationMap({ position, onSelect }: { position: [number, number]; onSelect: (lat: number, lng: number) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const callback = useRef(onSelect);
  const initialPosition = useRef(position);
  initialPosition.current = position;
  callback.current = onSelect;
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let listeners: any[] = [];
    void loadMaps().then(maps => {
      if (!active || !container.current) return;
      const center = { lat: initialPosition.current[0], lng: initialPosition.current[1] };
      map.current = new maps.Map(container.current, { center, zoom: 15, streetViewControl: false, mapTypeControl: false });
      marker.current = new maps.Marker({ map: map.current, position: center, draggable: true });
      const select = (location: any) => { if (location) callback.current(location.lat(), location.lng()); };
      listeners = [map.current.addListener('click', (event: any) => select(event.latLng)), marker.current.addListener('dragend', (event: any) => select(event.latLng))];
    }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; listeners.forEach(listener => listener.remove()); marker.current?.setMap(null); };
  }, []);
  useEffect(() => {
    const center = { lat: position[0], lng: position[1] };
    marker.current?.setPosition(center);
    map.current?.panTo(center);
  }, [position]);
  return <div style={{ height: 300, width: '100%', borderRadius: 8, overflow: 'hidden', background: '#f1f0f6' }}>{error ? <p role="alert" style={{ padding: 24 }}>{error} You can enter your address manually until the key is configured.</p> : <div ref={container} style={{ height: '100%' }} />}</div>;
}
