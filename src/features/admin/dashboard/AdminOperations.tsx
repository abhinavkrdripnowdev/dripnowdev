import { useEffect, useState } from 'react';
import api from '@/lib/api';
export function AdminOperations({ section }: { section: string }) {
  const [rows, setRows] = useState<any[]>([]), [cod, setCod] = useState<any[]>([]), [error, setError] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  async function load() {
    const path = section === 'delivery' ? '/admin/delivery/partners' : `/admin/${section}`;
    const result = (await api.get(path)).data.data;
    setRows(section === 'settings' ? Object.entries(result).map(([key, value]) => ({ id: key, value })) : result);
    if (section === 'delivery') setCod((await api.get('/admin/delivery/cod')).data.data);
    if (section === 'orders') setRequests((await api.get('/admin/order-requests')).data.data);
    if (section === 'users') setRequests((await api.get('/admin/admin-requests')).data.data);
  }
  useEffect(() => { load().catch(() => setError('Unable to load operations')); }, [section]);
  async function action(fn: () => Promise<unknown>) { try { await fn(); setError(''); await load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Action failed'); } }
  return <section className="operations-panel" style={{ padding: 20 }}><h2>{section === 'delivery' ? 'Delivery partners and COD' : section}</h2>{error && <p role="alert">{error}</p>}
    {section === 'users' && <><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.post('/admin/admin-requests', { user_id: f.get('user') })); }}><label>Verified user ID for admin nomination <input name="user" required /></label><button>Nominate</button></form><p>Admin promotion requires two distinct existing admin approvals.</p>{requests.map(r => <p key={r.id}>{r.target_user_id} · {r.status} {r.status === 'PENDING' && <button onClick={() => void action(() => api.post(`/admin/admin-requests/${r.id}/approve`))}>Record approval</button>}</p>)}</>}
    {section === 'orders' && <><h3>Return, exchange and refund review</h3>{requests.map(r => <article key={r.id}><p>{r.order_id} · {r.kind} · {r.status} · {r.reason}</p>{r.status === 'REQUESTED' && ['APPROVE', 'REJECT'].map(value => <button key={value} onClick={() => { const note = prompt('Review note'); if (note) void action(() => api.patch(`/admin/order-requests/${r.id}`, { action: value, note })); }}>{value}</button>)}{r.status === 'APPROVED' && <button onClick={() => { const reference = prompt(r.kind === 'EXCHANGE' ? 'Exchange completion evidence' : 'Processed Razorpay refund ID or verified COD bank reference'); if (reference) void action(() => r.kind === 'EXCHANGE' ? api.patch(`/admin/order-requests/${r.id}`, { action: 'EXCHANGE_COMPLETED', note: reference }) : api.post(`/admin/order-requests/${r.id}/refund`, { reference })); }}>{r.kind === 'EXCHANGE' ? 'Record completed exchange' : 'Verify completed refund'}</button>}</article>)}</>}
    {!rows.length && <p>No records found.</p>}
    {rows.map(r => <article key={r.id} style={{ padding: 12, borderBottom: '1px solid #666' }}>
      {section === 'settings' ? <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.patch('/admin/settings', { [r.id]: Number(f.get('value')) })); }}><label>{r.id} <input name="value" type="number" step="0.01" min="0" defaultValue={r.value} required /></label><button>Update</button></form> : section === 'delivery' ? <><p>{r.user_id} · {r.vehicle_type} · {r.license_number} · {r.status}</p><p>{r.review_reason}</p>{JSON.parse(r.documents_json || '[]').map((url: string) => <a key={url} href={url} target="_blank" rel="noreferrer">Review document </a>)}{['APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'].map(status => <button key={status} onClick={() => { const reason = prompt('Review reason'); if (reason) void action(() => api.patch(`/admin/delivery/partners/${r.id}`, { status, reason })); }}>{status}</button>)}</>
      : section === 'users' ? <><p>{r.full_name} · {r.email} · {r.account_status}</p><select defaultValue="" aria-label={`Change status for ${r.full_name}`} onChange={e => { const status = e.target.value, reason = prompt('Reason for account status change'); if (reason) void action(() => api.patch(`/admin/users/${r.id}/status`, { status, reason })); }}><option value="" disabled>Change status</option>{['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'].map(s => <option key={s}>{s}</option>)}</select></>
      : section === 'orders' ? <p>{r.id} · {r.status} · ₹{Number(r.final_amount).toFixed(2)} · {r.payment_status}</p>
      : <><p>{r.created_at} · {r.action ?? r.event_type} · {r.user_id}</p><pre style={{ whiteSpace: 'pre-wrap' }}>{typeof r.metadata === 'string' ? r.metadata : JSON.stringify(r.metadata ?? r.details)}</pre></>}
    </article>)}
    {section === 'delivery' && <><h3>Cash reconciliation</h3>{cod.map(r => <p key={r.id}>{r.partner_id} · ₹{(r.amount_paise / 100).toFixed(2)} · {r.status} {r.status !== 'RECONCILED' && <button onClick={() => { const reference = prompt('Verified cash deposit reference'); if (reference) void action(() => api.post(`/admin/delivery/cod/${r.id}/reconcile`, { reference })); }}>Reconcile</button>}</p>)}</>}
  </section>;
}
