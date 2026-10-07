import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, vehicleIcon } from '@/components/ui/Icon/Icon';
import api from '@/lib/api';
import { DocumentUpload, openDocument, type UploadedDocument } from '@/components/ui/DocumentUpload/DocumentUpload';

export type DeliverySection = 'overview' | 'available' | 'active' | 'history' | 'earnings' | 'profile';
type Props = { section: DeliverySection; onNavigate: (section: DeliverySection) => void };

const forwardNext: Record<string, { status: string; label: string }> = {
  DELIVERY_ASSIGNED: { status: 'PICKED_UP', label: 'Confirm pickup' },
  PICKED_UP: { status: 'IN_TRANSIT', label: 'Start delivery' },
  IN_TRANSIT: { status: 'DELIVERED', label: 'Complete delivery' },
};
const statusLabel = (value: string) => value?.split('_').join(' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? '';
const money = (paise: number | string = 0) => `₹${(Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const parseAddress = (value: any) => { try { return typeof value === 'string' ? JSON.parse(value) : value ?? {}; } catch { return {}; } };
const mapUrl = (latitude: unknown, longitude: unknown) => `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

function StatusTrack({ status }: { status: string }) {
  const stages = ['DELIVERY_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
  const current = Math.max(0, stages.indexOf(status));
  return <div className="delivery-status-track" aria-label={`Delivery status: ${statusLabel(status)}`}>
    {stages.map((stage, index) => <div key={stage} className={index <= current ? 'is-complete' : ''}><span>{index < current ? <Icon name="tick" size={14} /> : index + 1}</span><small>{statusLabel(stage)}</small></div>)}
  </div>;
}
function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="delivery-empty"><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>;
}

export function DeliveryOperations({ section, onNavigate }: Props) {
  const [profile, setProfile] = useState<any>(undefined);
  const [doc, setDoc] = useState<UploadedDocument | null>(null);
  const [docError, setDocError] = useState('');
  const [tasks, setTasks] = useState<any[]>([]), [offers, setOffers] = useState<any[]>([]);
  const [reverseTasks, setReverseTasks] = useState<any[]>([]), [reverseOffers, setReverseOffers] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]), [location, setLocation] = useState<any>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false), [codTask, setCodTask] = useState<any>(null), [cashRupees, setCashRupees] = useState('');

  const load = useCallback(async (quiet = false) => {
    try {
      const p = (await api.get('/delivery/profile')).data.data;
      setProfile(p);
      if (p?.status === 'APPROVED') {
        const [mine, available, reverseMine, reverseAvailable, earned, latestLocation] = await Promise.all([
          api.get('/delivery/tasks'), api.get('/delivery/tasks/available'), api.get('/delivery/reverse-tasks'),
          api.get('/delivery/reverse-tasks/available'), api.get('/delivery/earnings'), api.get('/delivery/location'),
        ]);
        setTasks(mine.data.data ?? []); setOffers(available.data.data ?? []);
        setReverseTasks(reverseMine.data.data ?? []); setReverseOffers(reverseAvailable.data.data ?? []);
        setEarnings(earned.data.data ?? []); setLocation(latestLocation.data.data);
      }
      if (!quiet) setError('');
    } catch (e: any) { if (!quiet) setError(e.response?.data?.message ?? 'Unable to load delivery operations'); }
  }, []);

  useEffect(() => { void load(); const interval = window.setInterval(() => void load(true), 15000); return () => window.clearInterval(interval); }, [load]);
  useEffect(() => {
    if (!sharing) return;
    if (!navigator.geolocation) { setError('Live location is unavailable in this browser.'); setSharing(false); return; }
    const watch = navigator.geolocation.watchPosition(position => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, updated_at: new Date().toISOString() };
      setLocation(next);
      void api.put('/delivery/location', { latitude: next.latitude, longitude: next.longitude }).catch(() => setError('Live location update failed.'));
    }, e => { setError(e.message); setSharing(false); }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing]);

  const activeTasks = useMemo(() => tasks.filter(t => !['DELIVERED', 'CANCELLED'].includes(t.status)), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => ['DELIVERED', 'CANCELLED'].includes(t.status)), [tasks]);
  const activeReverse = useMemo(() => reverseTasks.filter(t => !['DELIVERED', 'CANCELLED'].includes(t.status)), [reverseTasks]);
  const completedReverse = useMemo(() => reverseTasks.filter(t => ['DELIVERED', 'CANCELLED'].includes(t.status)), [reverseTasks]);
  const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.earning_paise), 0);
  const todayEarnings = earnings.filter(item => item.delivered_at && new Date(item.delivered_at).toDateString() === new Date().toDateString()).reduce((sum, item) => sum + Number(item.earning_paise), 0);
  const locationFresh = location?.updated_at && Date.now() - new Date(location.updated_at).getTime() < 5 * 60000;

  async function action(fn: () => Promise<unknown>, success?: string) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); if (success) setNotice(success); await load(); return true; }
    catch (e: any) { setError(e.response?.data?.message ?? 'Action failed. Please try again.'); return false; }
    finally { setBusy(false); }
  }
  function updateLocationOnce(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Location is unavailable in this browser.')); return; }
      navigator.geolocation.getCurrentPosition(async position => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, updated_at: new Date().toISOString() };
        try { await api.put('/delivery/location', { latitude: next.latitude, longitude: next.longitude }); setLocation(next); resolve(); }
        catch (locationError) { reject(locationError); }
      }, reject, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    });
  }
  async function toggleAvailability() {
    if (!profile.available && !locationFresh) {
      setBusy(true); setError('');
      try { await updateLocationOnce(); await api.patch('/delivery/availability', { available: true }); setNotice('You are online and ready to receive nearby orders.'); await load(); }
      catch (e: any) { setError(e.message ?? 'Share your current location before going online.'); }
      finally { setBusy(false); }
      return;
    }
    await action(() => api.patch('/delivery/availability', { available: !profile.available }), profile.available ? 'You are now offline.' : 'You are now online.');
  }
  function progressTask(task: any) {
    const next = forwardNext[task.status]; if (!next) return;
    if (next.status === 'DELIVERED' && task.payment_method === 'cod') { setCodTask(task); setCashRupees(Number(task.total_amount).toFixed(2)); return; }
    void action(() => api.patch(`/delivery/tasks/${task.id}/status`, { status: next.status }), `${next.label} recorded successfully.`);
  }
  async function acceptDelivery(task: any, reverse: boolean) {
    const accepted = await action(() => api.post(`/delivery/${reverse ? 'reverse-tasks' : 'tasks'}/${task.id}/accept`), 'Delivery accepted. Your route is ready.');
    if (accepted) onNavigate('active');
  }

  if (profile === undefined) return <div className="delivery-loader"><span /><p>Preparing your delivery workspace…</p></div>;
  if (!profile || profile.status === 'REJECTED') return <section className="delivery-workspace">
    <header className="delivery-page-header"><div><span className="delivery-eyebrow">Partner onboarding</span><h1>Start delivering with DripNow</h1><p>Submit your vehicle and identity details for a secure account review.</p></div><span className={`delivery-pill delivery-pill--${profile ? 'rejected' : 'draft'}`}>{profile ? 'Needs changes' : 'Application draft'}</span></header>
    {profile?.review_reason && <div className="delivery-alert delivery-alert--error"><span><Icon name="alert" size={16} /></span><p><b>Review note:</b> {profile.review_reason}</p></div>}
    {error && <div className="delivery-alert delivery-alert--error" role="alert"><span><Icon name="alert" size={16} /></span><p>{error}</p></div>}
    <div className="delivery-onboarding-grid"><div className="delivery-card delivery-application-card"><div className="delivery-card-heading"><span><Icon name="scooter" size={20} /></span><div><h2>Vehicle & identity</h2><p>Details must match the uploaded document.</p></div></div><form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); if (!doc) { setDocError('Please upload your verification document.'); return; } void action(() => api.post('/delivery/profile', { vehicle_type: form.get('vehicle'), license_number: form.get('license'), documents: [doc.dataUrl] }), 'Application submitted for review.'); }}><label><span>Vehicle type</span><select name="vehicle" defaultValue={profile?.vehicle_type ?? 'motorcycle'}><option value="motorcycle">Motorcycle / Scooter</option><option value="bicycle">Bicycle</option><option value="car">Car</option><option value="van">Delivery van</option></select></label><label><span>License or identity number</span><input name="license" minLength={3} defaultValue={profile?.license_number} placeholder="Enter the number shown on your document" required /></label><DocumentUpload label="Verification document" value={doc} onChange={(d) => { setDoc(d); setDocError(''); }} onError={setDocError} hint="Upload your driving licence or government ID (PDF, PNG or JPG)." />{docError && <p role="alert" className="delivery-form-error">{docError}</p>}<button className="delivery-primary-btn" disabled={busy}>{busy ? 'Submitting…' : profile ? 'Resubmit application' : 'Submit for review'} <span>→</span></button></form></div><aside className="delivery-onboarding-aside"><span className="delivery-onboarding-icon"><Icon name="tick" size={16} /></span><h2>What happens next?</h2><div><b>1</b><p><strong>Application review</strong><small>Operations verifies your details.</small></p></div><div><b>2</b><p><strong>Go online</strong><small>Share location to see nearby jobs.</small></p></div><div><b>3</b><p><strong>Accept and deliver</strong><small>Follow the guided delivery stages.</small></p></div><em>Most reviews are completed after all documents are readable.</em></aside></div>
  </section>;
  if (profile.status !== 'APPROVED') return <section className="delivery-workspace"><div className="delivery-review-state"><span><Icon name="clock" size={18} /></span><h1>Application under review</h1><p>Your delivery partner application is currently <b>{statusLabel(profile.status)}</b>. We’ll notify you after the operations team completes its checks.</p><div><b>Vehicle</b><span>{statusLabel(profile.vehicle_type)}</span><b>License / ID</b><span>{profile.license_number}</span></div><button className="delivery-secondary-btn" onClick={() => void load()} disabled={busy}>Refresh status</button></div></section>;

  return <section className="delivery-workspace">
    {error && <div className="delivery-alert delivery-alert--error" role="alert"><span><Icon name="alert" size={16} /></span><p>{error}</p><button onClick={() => setError('')}>×</button></div>}
    {notice && <div className="delivery-alert delivery-alert--success" role="status"><span><Icon name="tick" size={16} /></span><p>{notice}</p><button onClick={() => setNotice('')}>×</button></div>}
    {section === 'overview' && <><header className="delivery-page-header"><div><span className="delivery-eyebrow">Delivery command center</span><h1>Ready for the road?</h1><p>Manage nearby orders, your active route, live tracking and earnings.</p></div><button className={`delivery-online-toggle ${profile.available ? 'is-online' : ''}`} onClick={() => void toggleAvailability()} disabled={busy}><i />{profile.available ? 'Online' : 'Go online'}</button></header><div className="delivery-metrics"><div><span className="purple"><Icon name="box" size={18} /></span><p>Open orders<small>Near your current location</small></p><b>{offers.length + reverseOffers.length}</b></div><div><span className="blue"><Icon name="arrow" size={18} /></span><p>Active delivery<small>Your current route</small></p><b>{activeTasks.length + activeReverse.length}</b></div><div><span className="green"><Icon name="rupee" size={18} /></span><p>Today’s earnings<small>Completed deliveries</small></p><b>{money(todayEarnings)}</b></div><div><span className="orange"><Icon name="tick" size={16} /></span><p>Total completed<small>All delivery history</small></p><b>{earnings.length}</b></div></div><div className="delivery-overview-grid"><div className="delivery-card delivery-focus-card"><div className="delivery-card-heading"><span><Icon name="pin" size={20} /></span><div><h2>{activeTasks.length || activeReverse.length ? 'Continue active delivery' : 'Find your next delivery'}</h2><p>{activeTasks.length || activeReverse.length ? 'Your current job is ready for the next update.' : 'Go online and keep your location current to receive jobs.'}</p></div></div>{activeTasks[0] ? <ActiveDeliveryCard task={activeTasks[0]} busy={busy} sharing={sharing} setSharing={setSharing} onProgress={progressTask} /> : activeReverse[0] ? <ReverseActiveCard task={activeReverse[0]} busy={busy} onProgress={(status: string) => void action(() => api.patch(`/delivery/reverse-tasks/${activeReverse[0].id}/status`, { status }))} /> : <div className="delivery-focus-empty"><div className={profile.available ? 'pulse' : ''}><Icon name="scooter" size={30} /></div><h3>{profile.available ? 'You’re available for orders' : 'You are currently offline'}</h3><p>{profile.available ? `${offers.length + reverseOffers.length} nearby job${offers.length + reverseOffers.length === 1 ? '' : 's'} available right now.` : 'Go online to start receiving nearby delivery opportunities.'}</p><button className="delivery-primary-btn" onClick={() => profile.available ? onNavigate('available') : void toggleAvailability()} disabled={busy}>{profile.available ? 'View open orders' : 'Go online'} →</button></div>}</div><aside className="delivery-card delivery-location-card"><div className="delivery-card-heading"><span><Icon name="pin" size={18} /></span><div><h2>Live location</h2><p>Required for matching and customer tracking.</p></div></div><div className={`delivery-map-placeholder ${sharing ? 'is-live' : ''}`}><span><Icon name="pin" size={18} /></span><div><b>{sharing ? 'Sharing live location' : locationFresh ? 'Location is current' : 'Location needs an update'}</b><small>{location?.updated_at ? `Updated ${new Date(location.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No location shared yet'}</small></div></div><button className={sharing ? 'delivery-danger-btn' : 'delivery-secondary-btn'} onClick={() => setSharing(v => !v)}>{sharing ? 'Stop live tracking' : 'Start live tracking'}</button><button className="delivery-text-btn" onClick={() => void action(updateLocationOnce, 'Current location updated.')} disabled={busy}>Update once</button><p className="delivery-privacy-note">⌾ Your location is shared only while fulfilling delivery operations.</p></aside></div><div className="delivery-section-heading"><div><h2>Nearby open orders</h2><p>Orders available for immediate acceptance.</p></div><button className="delivery-text-btn" onClick={() => onNavigate('available')}>See all →</button></div><OpenOrders offers={offers.slice(0, 3)} reverseOffers={reverseOffers.slice(0, 3)} profile={profile} locationFresh={locationFresh} busy={busy} onAccept={(task: any, reverse: boolean) => void acceptDelivery(task, reverse)} /></>}
    {section === 'available' && <><header className="delivery-page-header"><div><span className="delivery-eyebrow">Nearby opportunities</span><h1>Open orders</h1><p>Review route distance and earnings before accepting a delivery.</p></div><button className={`delivery-online-toggle ${profile.available ? 'is-online' : ''}`} onClick={() => void toggleAvailability()} disabled={busy}><i />{profile.available ? 'Online' : 'Go online'}</button></header><OpenOrders offers={offers} reverseOffers={reverseOffers} profile={profile} locationFresh={locationFresh} busy={busy} onAccept={(task: any, reverse: boolean) => void acceptDelivery(task, reverse)} /></>}
    {section === 'active' && <><header className="delivery-page-header"><div><span className="delivery-eyebrow">Route progress</span><h1>Active delivery</h1><p>Navigate, confirm pickup, share location and complete the drop safely.</p></div>{(activeTasks.length + activeReverse.length) > 0 && <span className="delivery-pill delivery-pill--active">● In progress</span>}</header>{!activeTasks.length && !activeReverse.length ? <EmptyState icon={<Icon name="flag" size={30} />} title="No active delivery" text="Accept an open order and it will appear here with its complete route." /> : <div className="delivery-active-list">{activeTasks.map(task => <ActiveDeliveryCard key={task.id} task={task} busy={busy} sharing={sharing} setSharing={setSharing} onProgress={progressTask} />)}{activeReverse.map(task => <ReverseActiveCard key={task.id} task={task} busy={busy} onProgress={(status: string) => void action(() => api.patch(`/delivery/reverse-tasks/${task.id}/status`, { status }))} />)}</div>}</>}
    {section === 'history' && <><header className="delivery-page-header"><div><span className="delivery-eyebrow">Delivery archive</span><h1>Delivery history</h1><p>Review every completed, returned or cancelled delivery.</p></div><span className="delivery-header-count">{completedTasks.length + completedReverse.length} records</span></header>{!completedTasks.length && !completedReverse.length ? <EmptyState icon="▤" title="No completed deliveries yet" text="Your delivered orders will be saved here." /> : <div className="delivery-history-table"><div className="delivery-history-head"><span>Order</span><span>Type</span><span>Distance</span><span>Earning</span><span>Status</span><span>Completed</span></div>{completedTasks.map(task => <div key={task.id}><b>#{String(task.order_id ?? task.id).slice(0, 8).toUpperCase()}</b><span>Customer delivery</span><span>{Number(task.distance_km ?? 0).toFixed(1)} km</span><strong>{money(task.earning_paise)}</strong><em className={`delivery-status delivery-status--${task.status.toLowerCase()}`}>{statusLabel(task.status)}</em><span>{task.delivered_at ? new Date(task.delivered_at).toLocaleDateString('en-IN') : '—'}</span></div>)}{completedReverse.map(task => <div key={task.id}><b>#{String(task.id).slice(0, 8).toUpperCase()}</b><span>{statusLabel(task.kind)}</span><span>{Number(task.distance_km ?? 0).toFixed(1)} km</span><strong>{money(task.earning_paise)}</strong><em className={`delivery-status delivery-status--${task.status.toLowerCase()}`}>{statusLabel(task.status)}</em><span>{task.delivered_at ? new Date(task.delivered_at).toLocaleDateString('en-IN') : '—'}</span></div>)}</div>}</>}
    {section === 'earnings' && <><header className="delivery-page-header"><div><span className="delivery-eyebrow">Partner payouts</span><h1>Earnings</h1><p>Track delivery earnings and route bonuses.</p></div><span className="delivery-pill delivery-pill--approved">Approved partner</span></header><div className="delivery-earnings-hero"><div><small>Lifetime delivery earnings</small><h2>{money(totalEarnings)}</h2><p>Across {earnings.length} completed deliveries</p></div><span><Icon name="rupee" size={18} /></span></div><div className="delivery-metrics delivery-metrics--three"><div><span className="green"><Icon name="rupee" size={18} /></span><p>Earned today<small>Since midnight</small></p><b>{money(todayEarnings)}</b></div><div><span className="blue"><Icon name="arrow" size={18} /></span><p>Average per trip<small>Completed jobs</small></p><b>{money(earnings.length ? totalEarnings / earnings.length : 0)}</b></div><div><span className="purple"><Icon name="box" size={18} /></span><p>Total distance<small>Delivered routes</small></p><b>{earnings.reduce((sum, item) => sum + Number(item.distance_km ?? 0), 0).toFixed(1)} km</b></div></div>{!earnings.length ? <EmptyState icon="₹" title="No earnings yet" text="Complete your first delivery to start tracking earnings." /> : <div className="delivery-earning-list">{earnings.map(item => <div key={item.id}><span><Icon name="tick" size={16} /></span><p><b>Delivery #{String(item.id).slice(0, 8).toUpperCase()}</b><small>{new Date(item.delivered_at).toLocaleString('en-IN')} · {Number(item.distance_km ?? 0).toFixed(1)} km</small></p>{Number(item.multi_seller_bonus_paise) > 0 && <em>+ bonus {money(item.multi_seller_bonus_paise)}</em>}<strong>{money(item.earning_paise)}</strong></div>)}</div>}</>}
    {section === 'profile' && <><header className="delivery-page-header"><div><span className="delivery-eyebrow">Partner account</span><h1>Profile & vehicle</h1><p>Your verified delivery identity and operational status.</p></div><span className="delivery-pill delivery-pill--approved">Approved</span></header><div className="delivery-profile-grid"><div className="delivery-card delivery-profile-card"><div className="delivery-profile-hero"><span><Icon name={vehicleIcon(profile.vehicle_type)} size={26} /></span><div><h2>{statusLabel(profile.vehicle_type)}</h2><p>Verified delivery vehicle</p></div></div><dl><div><dt>License / identity number</dt><dd>{profile.license_number}</dd></div><div><dt>Account status</dt><dd><em className="delivery-status delivery-status--delivered">Approved</em></dd></div><div><dt>Work availability</dt><dd>{profile.available ? 'Online' : 'Offline'}</dd></div><div><dt>Partner since</dt><dd>{new Date(profile.created_at).toLocaleDateString('en-IN')}</dd></div></dl></div><aside className="delivery-card delivery-documents-card"><div className="delivery-card-heading"><span><Icon name="doc" size={18} /></span><div><h2>Verification documents</h2><p>Documents submitted during onboarding.</p></div></div>{parseAddress(profile.documents_json)?.map?.((document: string, index: number) => <a key={document.slice(0, 80) + index} href={document} onClick={(e) => { e.preventDefault(); openDocument(document); }}><span>PDF</span><p><b>Identity document {index + 1}</b><small>Open secure document</small></p><i><Icon name="arrow" size={14} /></i></a>)}<div className="delivery-verified-note">Identity and vehicle details verified by DripNow operations.</div></aside></div></>}
    {codTask && <div className="delivery-modal-backdrop" role="presentation"><form className="delivery-modal" role="dialog" aria-modal="true" aria-labelledby="cod-title" onSubmit={e => { e.preventDefault(); const paise = Math.round(Number(cashRupees) * 100); void action(() => api.patch(`/delivery/tasks/${codTask.id}/status`, { status: 'DELIVERED', cash_paise: paise }), 'Delivery completed and cash recorded.').then(success => { if (success) setCodTask(null); }); }}><span className="delivery-modal-icon"><Icon name="rupee" size={20} /></span><h2 id="cod-title">Confirm cash collection</h2><p>Collect the exact amount from the customer before completing this COD delivery.</p><label>Cash collected<input type="number" min="0" step="0.01" value={cashRupees} onChange={e => setCashRupees(e.target.value)} required /></label><small>Amount due: <b>₹{Number(codTask.total_amount).toFixed(2)}</b></small><div><button type="button" className="delivery-secondary-btn" onClick={() => setCodTask(null)}>Cancel</button><button className="delivery-primary-btn" disabled={busy}>Confirm & complete</button></div></form></div>}
  </section>;
}

function OpenOrders({ offers, reverseOffers, profile, locationFresh, busy, onAccept }: any) {
  if (!profile.available || !locationFresh) return <div className="delivery-offline-state"><span><Icon name="pin" size={18} /></span><div><h3>{profile.available ? 'Update your location to see orders' : 'Go online to receive open orders'}</h3><p>Nearby jobs appear when your availability and current location are active.</p></div></div>;
  if (!offers.length && !reverseOffers.length) return <EmptyState icon="⌁" title="No open orders nearby" text="You’re online. New pickup opportunities refresh automatically every 15 seconds." />;
  return <div className="delivery-order-grid">{offers.map((task: any) => { const drop = parseAddress(task.drop_address); return <article className="delivery-order-card" key={task.id}><div className="delivery-order-card-top"><span>Customer delivery</span><em>{money(task.earning_paise)} earning</em></div><h3>{task.pickup_name || 'Seller pickup'}</h3><div className="delivery-route-mini"><div><i className="pickup" /><p><small>Pickup</small><b>{task.pickup_address}{task.pickup_city ? `, ${task.pickup_city}` : ''}</b></p></div><span /><div><i className="drop" /><p><small>Drop</small><b>{drop.address_line1}, {drop.city}</b></p></div></div><div className="delivery-order-meta"><span>◎ {Number(task.distance_to_pickup_km ?? 0).toFixed(1)} km away</span><span>↗ {Number(task.distance_km ?? 0).toFixed(1)} km route</span><span>{task.payment_method === 'cod' ? 'Cash on delivery' : 'Prepaid'}</span></div><button className="delivery-primary-btn" disabled={busy} onClick={() => onAccept(task, false)}>Accept delivery <span>→</span></button></article>; })}{reverseOffers.map((task: any) => <article className="delivery-order-card delivery-order-card--return" key={task.id}><div className="delivery-order-card-top"><span>{statusLabel(task.kind)}</span><em>{money(task.earning_paise)} earning</em></div><h3>Return or exchange pickup</h3><div className="delivery-route-summary"><span><Icon name="undo" size={18} /></span><p><b>{Number(task.distance_to_pickup_km ?? 0).toFixed(1)} km to pickup</b><small>{Number(task.distance_km ?? 0).toFixed(1)} km delivery route</small></p></div><button className="delivery-primary-btn" disabled={busy} onClick={() => onAccept(task, true)}>Accept task <span>→</span></button></article>)}</div>;
}

function ActiveDeliveryCard({ task, busy, sharing, setSharing, onProgress }: any) {
  const drop = parseAddress(task.address_snapshot), next = forwardNext[task.status];
  return <article className="delivery-active-card"><div className="delivery-active-card-top"><div><span>Order #{String(task.order_id ?? task.id).slice(0, 8).toUpperCase()}</span><h2>{statusLabel(task.status)}</h2></div><em>{task.payment_method === 'cod' ? `Collect ₹${Number(task.total_amount).toFixed(2)}` : 'Prepaid order'}</em></div><StatusTrack status={task.status} /><div className="delivery-route-details"><div><i className="pickup" /><p><small>Pickup from</small><b>{task.pickup_name || 'Seller pickup'}</b><span>{task.pickup_address}, {task.pickup_city}</span></p>{task.pickup_latitude && <a href={mapUrl(task.pickup_latitude, task.pickup_longitude)} target="_blank" rel="noreferrer">Navigate ↗</a>}</div><div><i className="drop" /><p><small>Deliver to</small><b>{task.customer_name || 'Customer'}</b><span>{drop.address_line1}, {drop.city} {drop.postal_code}</span></p>{drop.latitude && <a href={mapUrl(drop.latitude, drop.longitude)} target="_blank" rel="noreferrer">Navigate ↗</a>}</div></div><div className="delivery-active-meta"><span>↗ {Number(task.distance_km ?? 0).toFixed(1)} km</span><span>₹ {money(task.earning_paise)} earning</span>{task.customer_phone && <a href={`tel:${task.customer_phone}`}><Icon name="phone" size={15} /> Call customer</a>}</div><div className="delivery-active-actions"><button className={sharing ? 'delivery-danger-btn' : 'delivery-secondary-btn'} onClick={() => setSharing((value: boolean) => !value)}>{sharing ? '● Stop live tracking' : '◎ Share live location'}</button>{next && <button className="delivery-primary-btn" disabled={busy} onClick={() => onProgress(task)}>{next.label} <span>→</span></button>}</div></article>;
}
function ReverseActiveCard({ task, busy, onProgress }: any) {
  const next = forwardNext[task.status];
  return <article className="delivery-active-card"><div className="delivery-active-card-top"><div><span>{statusLabel(task.kind)} task</span><h2>{statusLabel(task.status)}</h2></div><em>{money(task.earning_paise)} earning</em></div><StatusTrack status={task.status} /><div className="delivery-route-details"><div><i className="pickup" /><p><small>Customer pickup</small><b>Return collection point</b><span>{Number(task.distance_km ?? 0).toFixed(1)} km route</span></p><a href={mapUrl(task.pickup_latitude, task.pickup_longitude)} target="_blank" rel="noreferrer">Navigate ↗</a></div><div><i className="drop" /><p><small>Return destination</small><b>Seller location</b><span>Complete the handover at the destination.</span></p><a href={mapUrl(task.drop_latitude, task.drop_longitude)} target="_blank" rel="noreferrer">Navigate ↗</a></div></div>{next && <div className="delivery-active-actions"><span /><button className="delivery-primary-btn" disabled={busy} onClick={() => onProgress(next.status)}>{next.label} <span>→</span></button></div>}</article>;
}
