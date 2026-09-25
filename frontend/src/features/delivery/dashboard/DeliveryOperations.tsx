import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export function DeliveryOperations() {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const load = useCallback(async () => {
    try {
      const p = (await api.get('/delivery/profile')).data.data; setProfile(p);
      if (p) {
        const [mine, available] = await Promise.all([api.get('/delivery/tasks'), api.get('/delivery/tasks/available')]);
        setTasks(mine.data.data); setOffers(available.data.data);
      }
    } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load deliveries'); }
  }, []);
  useEffect(() => { void load(); const interval = setInterval(load, 15000); return () => clearInterval(interval); }, [load]);
  useEffect(() => {
    if (!sharing) return;
    if (!navigator.geolocation) { setError('Location sharing is unavailable in this browser'); return; }
    const watch = navigator.geolocation.watchPosition(position => {
      void api.put('/delivery/location', { latitude: position.coords.latitude, longitude: position.coords.longitude }).catch(() => setError('Location update failed'));
    }, e => { setError(e.message); setSharing(false); }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing]);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Action failed'); } finally { setBusy(false); }
  }
  return <section className="dash-table-wrap operations-panel" style={{ padding: 24 }}>
    <h2>Delivery operations</h2>
    {error && <p role="alert">{error}</p>}
    {!profile || profile.status === 'REJECTED' ? <form onSubmit={e => {
      e.preventDefault(); const form = new FormData(e.currentTarget);
      void action(() => api.post('/delivery/profile', { vehicle_type: form.get('vehicle'), license_number: form.get('license'), documents: [form.get('document')] }));
    }}>
      <p>Submit your vehicle details and document for admin review.</p>
      <label>Vehicle <select name="vehicle"><option value="motorcycle">Motorcycle</option><option value="bicycle">Bicycle</option><option value="car">Car</option><option value="van">Van</option></select></label>
      <label>License / identity number <input name="license" minLength={3} required /></label>
      <label>Document URL <input name="document" type="url" required /></label>
      <button disabled={busy}>Submit application</button>
    </form> : <>
      <p>Application: {profile.status} {profile.review_reason && `— ${profile.review_reason}`}</p>
      {profile.status === 'APPROVED' && <>
        <button disabled={busy} onClick={() => void action(() => api.patch('/delivery/availability', { available: !profile.available }))}>{profile.available ? 'Go offline' : 'Go online'}</button>{' '}
        <button onClick={() => setSharing(!sharing)}>{sharing ? 'Stop sharing location' : 'Share live location'}</button>
        <p>Keep location sharing enabled while online. New nearby tasks appear below.</p>
        <h3>Available pickups</h3>
        {!offers.length && <p>No matching tasks. Your location must be current and within the pickup radius.</p>}
        {offers.map(t => <article key={t.id} style={{ padding: 12, border: '1px solid #666', marginBottom: 12 }}>
          <p>{t.pickup_address} · {t.distance_km} km away · Earning ₹{(t.earning_paise / 100).toFixed(2)}</p>
          <button disabled={busy} onClick={() => void action(() => api.post(`/delivery/tasks/${t.id}/accept`))}>Accept pickup</button>
        </article>)}
        <h3>My deliveries</h3>
        {tasks.map(t => {
          const next: Record<string, string> = { DELIVERY_ASSIGNED: 'PICKED_UP', PICKED_UP: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED' };
          const address = typeof t.address_snapshot === 'string' ? JSON.parse(t.address_snapshot) : t.address_snapshot;
          return <article key={t.id} style={{ padding: 12, border: '1px solid #666', marginBottom: 12 }}>
            <p>{address?.address_line1}, {address?.city} · {t.status}</p>
            <p>Earning ₹{(t.earning_paise / 100).toFixed(2)}{t.payment_method === 'cod' && ` · Cash to collect ₹${Number(t.total_amount).toFixed(2)}`}</p>
            {next[t.status] && <button disabled={busy} onClick={() => {
              let cash: number | undefined;
              if (next[t.status] === 'DELIVERED' && t.payment_method === 'cod') {
                const value = window.prompt(`Enter cash collected in rupees (due ₹${Number(t.total_amount).toFixed(2)})`);
                if (value === null) return; cash = Math.round(Number(value) * 100);
              }
              void action(() => api.patch(`/delivery/tasks/${t.id}/status`, { status: next[t.status], cash_paise: cash }));
            }}>{next[t.status].replace(/_/g, ' ')}</button>}
          </article>;
        })}
        <p>Delivered earnings: ₹{(tasks.filter(t => t.status === 'DELIVERED').reduce((sum, t) => sum + t.earning_paise, 0) / 100).toFixed(2)}</p>
      </>}
    </>}
  </section>;
}
