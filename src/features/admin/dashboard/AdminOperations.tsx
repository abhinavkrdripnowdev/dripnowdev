import { useEffect, useMemo, useState } from 'react';
import { Icon, vehicleIcon } from '@/components/ui/Icon/Icon';
import api from '@/lib/api';
import { askReason } from '@/lib/dialog';
import { openDocument } from '@/components/ui/DocumentUpload/DocumentUpload';
import { useAuthStore } from '@/store/auth.store';

const money = (paise: unknown) => `₹${(Number(paise ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const title = (value: unknown) => String(value ?? '').split('_').join(' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());

const DANGER = new Set(['REJECTED', 'SUSPENDED', 'BLOCKED']);
const VERB: Record<string, string> = { APPROVED: 'Approve', REJECTED: 'Reject', SUSPENDED: 'Suspend', BLOCKED: 'Block', PENDING: 'Reset to pending' };
const verb = (status: string) => VERB[status] ?? title(status);
const askRef = (kind: 'payout' | 'cash' | 'refund') => askReason({
  payout: { title: 'Execute payout', label: 'Provider transfer reference', message: 'Enter the verified transfer reference from the payment provider.', confirmLabel: 'Execute payout' },
  cash: { title: 'Reconcile cash', label: 'Cash deposit reference', message: 'Enter the verified bank deposit reference for this collection.', confirmLabel: 'Reconcile' },
  refund: { title: 'Record refund', label: 'Refund reference', message: 'Enter the processed refund reference.', confirmLabel: 'Record refund' },
}[kind]);
const askNote = (heading: string, label: string, confirmLabel: string, danger = false) => askReason({ title: heading, label, confirmLabel, tone: danger ? 'danger' : 'default' });
const shortId = (value: unknown) => String(value ?? '').slice(0, 8).toUpperCase();
const safeJson = (value: unknown) => { try { return typeof value === 'string' ? JSON.parse(value) : value ?? {}; } catch { return {}; } };
const dateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const pageCopy: Record<string, { eyebrow: string; heading: string; text: string }> = {
  finance: { eyebrow: 'Money operations', heading: 'Finance control center', text: 'Monitor balances, settlements and protected payout workflows.' },
  reports: { eyebrow: 'Business intelligence', heading: 'Operational reports', text: 'A clear view of order value, settlements, rider earnings and refunds.' },
  delivery: { eyebrow: 'Last-mile operations', heading: 'Delivery partners & COD', text: 'Review riders, control account access and reconcile collected cash.' },
  users: { eyebrow: 'Account governance', heading: 'Users & admin access', text: 'Manage customer status and privileged two-admin nominations.' },
  orders: { eyebrow: 'Order operations', heading: 'Orders, returns & refunds', text: 'Track orders and move customer requests through controlled review.' },
  products: { eyebrow: 'Catalog safety', heading: 'Product moderation', text: 'Review seller listings and manage platform-wide promotions.' },
  audit: { eyebrow: 'Accountability', heading: 'Audit activity', text: 'Trace important authentication, moderation and financial actions.' },
  settings: { eyebrow: 'Platform controls', heading: 'Pricing & delivery settings', text: 'Configure platform-controlled charges and delivery matching.' },
};

function Status({ value }: { value: unknown }) {
  const normalized = String(value ?? 'UNKNOWN').toLowerCase();
  return <span className={`admin-status admin-status--${normalized}`}>{title(value || 'Unknown')}</span>;
}
function Empty({ icon, title: heading, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="admin-empty"><span>{icon}</span><h3>{heading}</h3><p>{text}</p></div>;
}
function PageHeader({ section, count }: { section: string; count?: number }) {
  const copy = pageCopy[section];
  return <header className="admin-page-header"><div><span className="admin-eyebrow">{copy.eyebrow}</span><h1>{copy.heading}</h1><p>{copy.text}</p></div>{count !== undefined && <span className="admin-header-count">{count} records</span>}</header>;
}

export function AdminOperations({ section }: { section: string }) {
  const [rows, setRows] = useState<any[]>([]), [cod, setCod] = useState<any[]>([]), [requests, setRequests] = useState<any[]>([]);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(true), [query, setQuery] = useState('');
  const isSuper = useAuthStore(s => Boolean(s.user?.roles.includes('super_admin')));

  async function load() {
    setLoading(true);
    try {
      const path = section === 'delivery' ? '/admin/delivery/partners' : section === 'finance' ? '/finance/accounts' : section === 'reports' ? '/finance/reports' : `/admin/${section}`;
      const result = (await api.get(path)).data.data;
      setRows(['settings', 'reports'].includes(section) ? Object.entries(result ?? {}).map(([key, value]) => ({ id: key, value })) : result ?? []);
      setCod(section === 'delivery' ? (await api.get('/admin/delivery/cod')).data.data ?? [] : section === 'finance' ? (await api.get('/finance/settlements')).data.data ?? [] : []);
      setRequests(section === 'orders' ? (await api.get('/admin/order-requests')).data.data ?? [] : section === 'users' ? (await api.get('/admin/admin-requests')).data.data ?? [] : section === 'finance' ? (await api.get('/finance/payouts')).data.data ?? [] : []);
      setError('');
    } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load operations.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { setQuery(''); setNotice(''); void load(); }, [section]);
  async function action(fn: () => Promise<unknown>, success: string) {
    try { await fn(); setError(''); setNotice(success); await load(); }
    catch (e: any) { setNotice(''); setError(e.response?.data?.message ?? 'Action failed.'); }
  }

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const needle = query.toLowerCase(); return rows.filter(row => JSON.stringify(row).toLowerCase().includes(needle));
  }, [rows, query]);

  if (loading) return <section className="admin-workspace"><div className="admin-loader"><span /><p>Loading {pageCopy[section]?.heading.toLowerCase()}…</p></div></section>;
  return <section className="admin-workspace">
    <PageHeader section={section} count={section === 'reports' || section === 'settings' ? undefined : rows.length} />
    {error && <div className="admin-alert admin-alert--error" role="alert"><span><Icon name="alert" size={16} /></span><p>{error}</p><button onClick={() => setError('')}>×</button></div>}
    {notice && <div className="admin-alert admin-alert--success" role="status"><span><Icon name="tick" size={16} /></span><p>{notice}</p><button onClick={() => setNotice('')}>×</button></div>}
    {section === 'finance' && <FinanceView rows={rows} settlements={cod} payouts={requests} isSuper={isSuper} action={action} />}
    {section === 'reports' && <ReportsView rows={rows} />}
    {section === 'delivery' && <DeliveryView rows={filteredRows} cod={cod} query={query} setQuery={setQuery} isSuper={isSuper} action={action} />}
    {section === 'users' && <UsersView rows={filteredRows} requests={requests} query={query} setQuery={setQuery} action={action} />}
    {section === 'orders' && <OrdersView rows={filteredRows} requests={requests} query={query} setQuery={setQuery} isSuper={isSuper} action={action} />}
    {section === 'products' && <ProductsView rows={filteredRows} query={query} setQuery={setQuery} isSuper={isSuper} action={action} />}
    {section === 'audit' && <AuditView rows={filteredRows} query={query} setQuery={setQuery} />}
    {section === 'settings' && <SettingsView rows={rows} action={action} />}
  </section>;
}

function Toolbar({ query, setQuery, placeholder, children }: any) {
  return <div className="admin-toolbar"><label><span><Icon name="search" size={18} /></span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder} /></label>{children}</div>;
}

function FinanceView({ rows, settlements, payouts, isSuper, action }: any) {
  const total = rows.reduce((sum: number, row: any) => sum + Number(row.balance_paise ?? 0), 0);
  const payable = rows.filter((row: any) => row.account_type === 'PAYABLE').reduce((sum: number, row: any) => sum + Number(row.balance_paise ?? 0), 0);
  const pending = payouts.filter((row: any) => !['COMPLETED', 'FAILED'].includes(row.status)).reduce((sum: number, row: any) => sum + Number(row.amount_paise ?? 0), 0);
  return <><div className="admin-metrics"><div><span className="green"><Icon name="rupee" size={18} /></span><p>Tracked balance<small>Across all ledger accounts</small></p><b>{money(total)}</b></div><div><span className="purple"><Icon name="arrow" size={18} /></span><p>Outstanding payable<small>Seller and rider obligations</small></p><b>{money(payable)}</b></div><div><span className="orange"><Icon name="clock" size={18} /></span><p>Pending payouts<small>Awaiting approval or execution</small></p><b>{money(pending)}</b></div><div><span className="blue"><Icon name="tick" size={16} /></span><p>Settlements<small>Generated seller settlements</small></p><b>{settlements.length}</b></div></div>
    {isSuper && <div className="admin-form-grid"><form className="admin-card admin-form-card" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const type = String(f.get('type')); void action(() => api.post('/finance/payouts', { beneficiary_type: type, beneficiary_id: f.get('beneficiary'), ...(type === 'SELLER' ? { settlement_ids: String(f.get('settlements')).split(',').map(v => v.trim()).filter(Boolean) } : { amount_paise: Number(f.get('amount')) }) }), 'Payout created for independent approval.'); }}><div className="admin-card-heading"><span><Icon name="rupee" size={18} /></span><div><h2>Create payout</h2><p>Initiator and approver must be different admins.</p></div></div><div className="admin-form-body"><label>Beneficiary type<select name="type"><option>SELLER</option><option>DELIVERY_PARTNER</option></select></label><label>Beneficiary ID<input name="beneficiary" placeholder="Verified beneficiary UUID" required /></label><label>Settlement IDs<input name="settlements" placeholder="Comma-separated for seller payouts" /></label><label>Rider amount in paise<input name="amount" type="number" min="1" placeholder="For delivery partner payouts" /></label><button className="admin-primary-btn">Create approval request</button></div></form>
      <form className="admin-card admin-form-card" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.post('/finance/earning-rules', { base_distance_km: Number(f.get('baseDistance')), base_amount_paise: Number(f.get('baseAmount')), additional_distance_unit_km: Number(f.get('unitDistance')), additional_amount_paise: Number(f.get('unitAmount')), multi_seller_addition_paise: Number(f.get('multiAmount')) }), 'New delivery earning rule activated.'); }}><div className="admin-card-heading"><span><Icon name="box" size={18} /></span><div><h2>Delivery earning rule</h2><p>Control rider earnings independently from customer fees.</p></div></div><div className="admin-form-body admin-form-body--grid"><label>Base distance (km)<input name="baseDistance" type="number" step="0.1" min="0.1" required /></label><label>Base amount (paise)<input name="baseAmount" type="number" min="0" required /></label><label>Additional distance unit<input name="unitDistance" type="number" step="0.1" min="0.1" required /></label><label>Amount per unit (paise)<input name="unitAmount" type="number" min="0" required /></label><label className="wide">Multi-seller bonus (paise)<input name="multiAmount" type="number" min="0" required /></label><button className="admin-primary-btn wide">Activate rule</button></div></form></div>}
    <div className="admin-section-heading"><div><h2>Financial accounts</h2><p>Current balances by owner and account type.</p></div><span>{rows.length} accounts</span></div>{!rows.length ? <Empty icon={<Icon name="rupee" size={30} />} title="No financial accounts yet" text="Accounts appear after the first eligible transaction." /> : <div className="admin-account-grid">{rows.map((row: any) => <article key={row.id}><span>{row.owner_type === 'PLATFORM' ? '◆' : row.owner_type === 'SELLER' ? '▣' : '↗'}</span><p><small>{title(row.owner_type)}</small><b>{title(row.account_type)}</b><em>…{String(row.owner_id).slice(-8)}</em></p><strong>{money(row.balance_paise)}</strong></article>)}</div>}
    <div className="admin-split-lists"><ListCard title="Seller settlements" subtitle="Eligible and paid seller balances" rows={settlements} empty="No settlements generated." render={(row: any) => <><p><b>#{shortId(row.id)}</b><small>Seller …{String(row.seller_id).slice(-8)}</small></p><strong>{money(row.payable_paise)}</strong><Status value={row.status} /></>} /><ListCard title="Payout workflow" subtitle="Independent approval and execution" rows={payouts} empty="No payouts created." render={(row: any) => <><p><b>{title(row.beneficiary_type)} payout</b><small>#{shortId(row.id)}</small></p><strong>{money(row.amount_paise)}</strong><Status value={row.status} />{isSuper && row.status === 'PENDING_APPROVAL' && <button className="admin-soft-btn" onClick={() => void action(() => api.post(`/finance/payouts/${row.id}/approve`, {}), 'Payout approved.')}>Approve</button>}{isSuper && row.status === 'APPROVED' && <button className="admin-primary-btn admin-primary-btn--small" onClick={async () => { const reference = await askRef('payout'); if (reference) void action(() => api.post(`/finance/payouts/${row.id}/execute`, { manual_reference: reference }), 'Payout executed.'); }}>Execute</button>}</>} /></div></>;
}

function ReportsView({ rows }: any) {
  const reports = Object.fromEntries(rows.map((row: any) => [row.id, row.value]));
  const groups = [
    { key: 'orders', icon: '▣', title: 'Orders', text: 'Order volume and collected value', color: 'purple' },
    { key: 'seller_settlements', icon: '₹', title: 'Seller settlements', text: 'Seller payable lifecycle', color: 'green' },
    { key: 'delivery_earnings', icon: '↗', title: 'Delivery earnings', text: 'Rider delivery earnings', color: 'blue' },
    { key: 'refunds', icon: '↺', title: 'Refunds', text: 'Refund processing status', color: 'orange' },
  ];
  return <><div className="admin-report-grid">{groups.map(group => { const data = Array.isArray(reports[group.key]) ? reports[group.key] : []; const count = data.reduce((sum: number, row: any) => sum + Number(row.count ?? 0), 0); const amount = data.reduce((sum: number, row: any) => sum + Number(row.amount_paise ?? 0), 0); return <article className="admin-card admin-report-card" key={group.key}><div className={`admin-report-icon ${group.color}`}>{group.icon}</div><div><h2>{group.title}</h2><p>{group.text}</p></div><div className="admin-report-total"><strong>{count}</strong><span>records</span><b>{money(amount)}</b></div>{!data.length ? <small>No activity recorded yet</small> : <ul>{data.map((row: any) => <li key={row.status}><Status value={row.status} /><span>{row.count} records</span><b>{money(row.amount_paise)}</b></li>)}</ul>}</article>; })}</div><div className="admin-section-heading"><div><h2>Account position</h2><p>Balances grouped by ledger owner.</p></div></div>{!Array.isArray(reports.accounts) || !reports.accounts.length ? <Empty icon="⌁" title="No account balances yet" text="Financial positions will appear after transactions are journaled." /> : <div className="admin-account-grid">{reports.accounts.map((row: any) => <article key={row.id}><span><Icon name="rupee" size={18} /></span><p><small>{title(row.owner_type)}</small><b>{title(row.account_type)}</b><em>…{String(row.owner_id).slice(-8)}</em></p><strong>{money(row.balance_paise)}</strong></article>)}</div>}</>;
}

function DeliveryView({ rows, cod, query, setQuery, isSuper, action }: any) {
  const approved = rows.filter((r: any) => r.status === 'APPROVED').length, pending = rows.filter((r: any) => r.status === 'PENDING').length, online = rows.filter((r: any) => Boolean(r.available)).length;
  return <>
    <div className="admin-metrics admin-metrics--three">
      <div><span className="orange"><Icon name="clock" size={18} /></span><p>Pending review<small>Applications needing action</small></p><b>{pending}</b></div>
      <div><span className="green"><Icon name="tick" size={16} /></span><p>Approved partners<small>Verified rider accounts</small></p><b>{approved}</b></div>
      <div><span className="blue"><Icon name="bolt" size={18} /></span><p>Currently online<small>Available for matching</small></p><b>{online}</b></div>
    </div>
    <Toolbar query={query} setQuery={setQuery} placeholder="Search rider, vehicle, license or status…" />
    {!rows.length ? <Empty icon={<Icon name="scooter" size={30} />} title="No delivery partners found" text="New partner applications will appear here for review." /> :
      <div className="admin-card-grid">{rows.map((row: any) => {
        const docs = safeJson(row.documents_json);
        return <article className="admin-card admin-partner-card" key={row.id}>
          <div className="admin-partner-top"><span><Icon name={vehicleIcon(row.vehicle_type)} size={22} /></span><div><h3>{title(row.vehicle_type)}</h3><p>License {row.license_number}</p></div><Status value={row.status} /></div>
          <dl><div><dt>Partner ID</dt><dd>#{shortId(row.id)}</dd></div><div><dt>Availability</dt><dd>{row.available ? '● Online' : '○ Offline'}</dd></div></dl>
          {row.review_reason && <p className="admin-review-note">{row.review_reason}</p>}
          <div className="admin-document-links">{Array.isArray(docs) && docs.map((url: string, index: number) => <a href={url} onClick={(e) => { e.preventDefault(); openDocument(url); }} key={url.slice(0, 80) + index}>▤ Document {index + 1} ↗</a>)}</div>
          <div className="admin-actions">{['APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'].map(status => <button className={status === 'APPROVED' ? 'admin-success-btn' : status === 'REJECTED' || status === 'BLOCKED' ? 'admin-danger-btn' : 'admin-soft-btn'} key={status} onClick={async () => { const reason = await askNote(`${verb(status)} partner`, 'Review reason', verb(status), DANGER.has(status)); if (reason) void action(() => api.patch(`/admin/delivery/partners/${row.id}`, { status, reason }), `Partner marked ${title(status)}.`); }}>{title(status)}</button>)}</div>
        </article>;
      })}</div>}
    <div className="admin-section-heading"><div><h2>COD reconciliation</h2><p>Cash collected by delivery partners.</p></div><span>{cod.length} records</span></div>
    {!cod.length ? <Empty icon={<Icon name="rupee" size={30} />} title="No cash awaiting reconciliation" text="Collected COD records will appear here." /> : <div className="admin-table"><div className="admin-table-head admin-table-row--cod"><span>Record</span><span>Partner</span><span>Amount</span><span>Status</span><span>Action</span></div>{cod.map((row: any) => <div className="admin-table-row--cod" key={row.id}><b>#{shortId(row.id)}</b><span>…{String(row.partner_id).slice(-8)}</span><strong>{money(row.amount_paise)}</strong><Status value={row.status} /><span>{isSuper && row.status !== 'RECONCILED' ? <button className="admin-primary-btn admin-primary-btn--small" onClick={async () => { const reference = await askRef('cash'); if (reference) void action(() => api.post(`/admin/delivery/cod/${row.id}/reconcile`, { reference }), 'Cash reconciled.'); }}>Reconcile</button> : '—'}</span></div>)}</div>}
  </>;
}

function UsersView({ rows, requests, query, setQuery, action }: any) {
  return <><div className="admin-card admin-nomination-card"><div><span><Icon name="shield" size={20} /></span><p><h2>Privileged admin nomination</h2><small>Requires approval from two distinct existing administrators. Self-promotion is blocked.</small></p></div><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.post('/admin/admin-requests', { user_id: f.get('user') }), 'Admin nomination created.'); }}><input name="user" placeholder="Verified active user UUID" required /><button className="admin-primary-btn">Nominate user</button></form></div>{requests.length > 0 && <div className="admin-approval-strip"><div><b>{requests.filter((r: any) => r.status === 'PENDING').length}</b><span>admin nominations pending</span></div>{requests.map((row: any) => <article key={row.id}><p><b>Target …{String(row.target_user_id).slice(-8)}</b><small>Request #{shortId(row.id)}</small></p><Status value={row.status} />{row.status === 'PENDING' && <button className="admin-soft-btn" onClick={() => void action(() => api.post(`/admin/admin-requests/${row.id}/approve`), 'Approval recorded.')}>Record approval</button>}</article>)}</div>}<div className="admin-section-heading"><div><h2>User directory</h2><p>Customer and platform account status.</p></div><span>{rows.length} users</span></div><Toolbar query={query} setQuery={setQuery} placeholder="Search by name, email or status…" />{!rows.length ? <Empty icon={<Icon name="users" size={30} />} title="No users found" text="Registered users will appear here." /> : <div className="admin-table"><div className="admin-table-head admin-table-row--users"><span>User</span><span>Email</span><span>System state</span><span>Account status</span><span>Action</span></div>{rows.map((row: any) => <div className="admin-table-row--users" key={row.id}><p className="admin-user-cell"><i>{String(row.full_name ?? row.email ?? 'U')[0].toUpperCase()}</i><b>{row.full_name || 'Unnamed user'}</b><small>#{shortId(row.id)}</small></p><span>{row.email || '—'}</span><span>{title(row.status)}</span><Status value={row.account_status} /><select defaultValue="" aria-label={`Change status for ${row.full_name}`} onChange={async e => { const status = e.target.value, select = e.currentTarget; select.value = ''; const reason = await askNote(`${verb(status)} account`, 'Reason for status change', verb(status), DANGER.has(status)); if (reason) void action(() => api.patch(`/admin/users/${row.id}/status`, { status, reason }), `Account status changed to ${title(status)}.`); }}><option value="" disabled>Change status…</option>{['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'].map(status => <option key={status}>{status}</option>)}</select></div>)}</div>}</>;
}

function OrdersView({ rows, requests, query, setQuery, isSuper, action }: any) {
  const value = rows.reduce((sum: number, row: any) => sum + Math.round(Number(row.final_amount ?? 0) * 100), 0), pending = requests.filter((r: any) => ['REQUESTED', 'APPROVED', 'PICKED_UP'].includes(r.status)).length;
  return <><div className="admin-metrics admin-metrics--three"><div><span className="purple"><Icon name="box" size={18} /></span><p>Total orders<small>All order records</small></p><b>{rows.length}</b></div><div><span className="green"><Icon name="rupee" size={18} /></span><p>Order value<small>Final customer totals</small></p><b>{money(value)}</b></div><div><span className="orange"><Icon name="undo" size={18} /></span><p>Open requests<small>Returns and exchanges</small></p><b>{pending}</b></div></div>{requests.length > 0 && <><div className="admin-section-heading"><div><h2>Return, exchange & refund review</h2><p>Requests needing an operational decision.</p></div><span>{requests.length} requests</span></div><div className="admin-request-grid">{requests.map((row: any) => <article className="admin-card" key={row.id}><div><span>{row.kind === 'EXCHANGE' ? '⇄' : '↺'}</span><p><small>Order #{shortId(row.order_id)}</small><h3>{title(row.kind)} request</h3></p><Status value={row.status} /></div><p>{row.reason || 'No customer reason supplied.'}</p><div className="admin-actions">{row.status === 'REQUESTED' && ['APPROVE', 'REJECT'].map(value => <button className={value === 'APPROVE' ? 'admin-success-btn' : 'admin-danger-btn'} key={value} onClick={async () => { const note = await askNote(value === 'APPROVE' ? 'Approve request' : 'Reject request', 'Review note', value === 'APPROVE' ? 'Approve' : 'Reject', value !== 'APPROVE'); if (note) void action(() => api.patch(`/admin/order-requests/${row.id}`, { action: value, note }), `Request ${value.toLowerCase()}d.`); }}>{title(value)}</button>)}{row.status === 'APPROVED' && <button className="admin-primary-btn admin-primary-btn--small" onClick={async () => { const note = await askNote('Pickup completed', 'Pickup evidence', 'Confirm pickup'); if (note) void action(() => api.patch(`/admin/order-requests/${row.id}/fulfillment`, { action: 'PICKUP_COMPLETED', note }), 'Pickup recorded.'); }}>Record pickup</button>}{row.status === 'PICKED_UP' && row.kind === 'RETURN' && <><button className="admin-success-btn" onClick={async () => { const note = await askNote('Inspection passed', 'Inspection note', 'Mark passed'); if (note) void action(() => api.patch(`/admin/order-requests/${row.id}/fulfillment`, { action: 'INSPECTION_PASSED', note }), 'Inspection passed.'); }}>Pass inspection</button><button className="admin-danger-btn" onClick={async () => { const note = await askNote('Inspection failed', 'Failure reason', 'Mark failed', true); if (note) void action(() => api.patch(`/admin/order-requests/${row.id}/fulfillment`, { action: 'INSPECTION_FAILED', note }), 'Inspection failed.'); }}>Fail inspection</button></>}{row.status === 'PICKED_UP' && row.kind === 'EXCHANGE' && <button className="admin-primary-btn admin-primary-btn--small" onClick={async () => { const note = await askNote('Complete exchange', 'Delivery evidence', 'Complete exchange'); if (note) void action(() => api.patch(`/admin/order-requests/${row.id}/fulfillment`, { action: 'EXCHANGE_COMPLETED', note }), 'Exchange completed.'); }}>Complete exchange</button>}{isSuper && row.kind !== 'EXCHANGE' && row.status === 'APPROVED' && row.inspection_status === 'PASSED' && <button className="admin-primary-btn admin-primary-btn--small" onClick={async () => { const reference = await askRef('refund'); if (reference) void action(() => api.post(`/admin/order-requests/${row.id}/refund`, { reference }), 'Refund recorded.'); }}>Record refund</button>}</div></article>)}</div></>}<div className="admin-section-heading"><div><h2>Order directory</h2><p>Payment and fulfillment status across the platform.</p></div></div><Toolbar query={query} setQuery={setQuery} placeholder="Search order ID, payment or status…" />{!rows.length ? <Empty icon="▣" title="No orders found" text="Orders will appear after the first checkout." /> : <div className="admin-table"><div className="admin-table-head admin-table-row--orders"><span>Order</span><span>Created</span><span>Payment</span><span>Order status</span><span>Total</span></div>{rows.map((row: any) => <div className="admin-table-row--orders" key={row.id}><b>#{shortId(row.id)}</b><span>{dateTime(row.created_at)}</span><p><Status value={row.payment_status} /><small>{title(row.payment_method)}</small></p><Status value={row.status} /><strong>₹{Number(row.final_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>)}</div>}</>;
}

function ProductsView({ rows, query, setQuery, isSuper, action }: any) {
  const pending = rows.filter((r: any) => r.moderation_status === 'PENDING').length;
  return <>{isSuper && <form className="admin-card admin-offer-builder" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.post('/admin/platform-offers', { name: f.get('name'), code: f.get('code') || undefined, offer_type: f.get('type'), discount_value: Number(f.get('value')), min_order_value: Number(f.get('minimum') || 0) }), 'Platform offer created.'); }}><div><span><Icon name="spark" size={20} /></span><p><h2>Create platform offer</h2><small>Platform-controlled promotion available across eligible sellers.</small></p></div><div><input name="name" placeholder="Campaign name" required /><input name="code" placeholder="Optional coupon" /><select name="type"><option value="percentage">Percentage off</option><option value="flat">Flat amount</option></select><input name="value" type="number" min="0.01" step="0.01" placeholder="Discount value" required /><input name="minimum" type="number" min="0" step="0.01" placeholder="Minimum order ₹" /><button className="admin-primary-btn">Create offer</button></div></form>}<div className="admin-section-heading"><div><h2>Product queue</h2><p>Approve, reject or suspend marketplace listings.</p></div><span>{pending} pending review</span></div><Toolbar query={query} setQuery={setQuery} placeholder="Search product, seller or moderation status…" />{!rows.length ? <Empty icon="▤" title="No products found" text="Seller products will appear here for moderation." /> : <div className="admin-product-grid">{rows.map((row: any) => <article className="admin-card" key={row.id}><div className="admin-product-media">{row.primary_image_url ? <img src={row.primary_image_url} alt="" /> : <span><Icon name="doc" size={18} /></span>}<Status value={row.moderation_status} /></div><div className="admin-product-body"><p><small>{row.business_name}</small><h3>{row.name}</h3></p><strong>₹{Number(row.base_price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong><div className="admin-actions">{['APPROVED', 'REJECTED', 'SUSPENDED'].map(status => <button className={status === 'APPROVED' ? 'admin-success-btn' : status === 'REJECTED' ? 'admin-danger-btn' : 'admin-soft-btn'} key={status} onClick={async () => { const note = await askNote(`${verb(status)} product`, 'Moderation note', verb(status), status === 'REJECTED'); if (note) void action(() => api.patch(`/admin/products/${row.id}/moderation`, { status, note }), `Product marked ${title(status)}.`); }}>{title(status)}</button>)}</div></div></article>)}</div>}</>;
}

function AuditView({ rows, query, setQuery }: any) {
  return <><Toolbar query={query} setQuery={setQuery} placeholder="Search event, user, date or metadata…"><span className="admin-live-chip"><i /> Immutable activity trail</span></Toolbar>{!rows.length ? <Empty icon="⌕" title="No audit activity found" text="Security and operational actions will appear here." /> : <div className="admin-audit-list">{rows.map((row: any) => { const metadata = safeJson(row.metadata ?? row.details); return <article key={row.id}><span>{String(row.action ?? row.event_type).includes('LOGIN') || String(row.action).includes('login') ? '↪' : String(row.action).includes('PAYOUT') ? '₹' : String(row.action).includes('PRODUCT') ? 'doc' : 'tick'}</span><div><h3>{title(row.action ?? row.event_type)}</h3><p>{dateTime(row.created_at)} · User …{String(row.user_id ?? 'system').slice(-8)}</p>{Object.keys(metadata).length > 0 && <details><summary>View event details</summary><pre>{JSON.stringify(metadata, null, 2)}</pre></details>}</div><code>#{shortId(row.id)}</code></article>; })}</div>}</>;
}

function SettingsView({ rows, action }: any) {
  const labels: Record<string, { label: string; hint: string; unit: string }> = { delivery_base_paise: { label: 'Customer delivery base', hint: 'Base charge before distance pricing', unit: 'paise' }, delivery_per_km_paise: { label: 'Customer charge per km', hint: 'Distance charge billed to customer', unit: 'paise' }, delivery_free_km: { label: 'Free delivery distance', hint: 'Distance included in base charge', unit: 'km' }, partner_base_paise: { label: 'Partner base earning', hint: 'Minimum rider earning per delivery', unit: 'paise' }, partner_per_km_paise: { label: 'Partner earning per km', hint: 'Additional rider distance earning', unit: 'paise' }, matching_radius_km: { label: 'Partner matching radius', hint: 'Nearby partner discovery range', unit: 'km' }, tax_basis_points: { label: 'Tax rate', hint: '100 basis points equals 1%', unit: 'bps' }, platform_fee_paise: { label: 'Platform fee', hint: 'Fixed platform-controlled checkout fee', unit: 'paise' } };
  return <div className="admin-settings-grid">{rows.map((row: any) => {
    const copy = labels[row.id] ?? { label: title(row.id), hint: 'Platform setting', unit: '' };
    return <form className="admin-card" key={row.id} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.patch('/admin/settings', { [row.id]: Number(f.get('value')) }), `${copy.label} updated.`); }}>
      <span><Icon name="gear" size={20} /></span><div><h3>{copy.label}</h3><p>{copy.hint}</p></div><label><input name="value" type="number" step="0.01" min="0" defaultValue={row.value} required /><em>{copy.unit}</em></label><button className="admin-soft-btn">Update</button>
    </form>;
  })}</div>;
}

function ListCard({ title: heading, subtitle, rows, empty, render }: any) {
  return <section className="admin-card admin-list-card"><div className="admin-card-heading"><span><Icon name="list" size={18} /></span><div><h2>{heading}</h2><p>{subtitle}</p></div></div>{!rows.length ? <p className="admin-list-empty">{empty}</p> : <div>{rows.map((row: any) => <article key={row.id}>{render(row)}</article>)}</div>}</section>;
}
