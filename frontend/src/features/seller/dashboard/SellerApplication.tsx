import { useEffect, useState } from 'react';
import api from '@/lib/api';

export function SellerApplication({ onSaved }: { onSaved: () => void }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [profile, setProfile] = useState<any>(null);
  useEffect(() => { api.get('/seller/profile').then(r => setProfile(r.data.data)).catch(() => undefined); }, []);
  const status = String(profile?.status ?? 'draft').toLowerCase();
  return <section className="seller-workspace">
    <header className="seller-page-header"><div><span className="seller-eyebrow">Seller verification</span><h1>Business profile</h1><p>Complete your business details so customers and operations teams can trust every order.</p></div><span className={`seller-status seller-status--${status}`}>{status === 'draft' ? 'NOT SUBMITTED' : status.toUpperCase()}</span></header>

    <div className="seller-onboarding-steps" aria-label="Application progress">
      <div className="seller-step seller-step--active"><span>1</span><div><b>Business details</b><small>Identity and trading name</small></div></div><i />
      <div className={profile?.documents?.length ? 'seller-step seller-step--active' : 'seller-step'}><span>2</span><div><b>Documents</b><small>PAN verification</small></div></div><i />
      <div className={profile?.location ? 'seller-step seller-step--active' : 'seller-step'}><span>3</span><div><b>Pickup location</b><small>Warehouse coordinates</small></div></div><i />
      <div className={status === 'approved' ? 'seller-step seller-step--active' : 'seller-step'}><span>4</span><div><b>Review</b><small>Admin approval</small></div></div>
    </div>

    {error && <div className="seller-alert" role="alert"><span>!</span><p>{error}</p><button onClick={() => setError('')}>×</button></div>}
    {profile?.rejection_reason && <div className="seller-alert"><span>!</span><p><b>Review note:</b> {profile.rejection_reason}</p></div>}

    <div className="seller-profile-layout">
      <div className="seller-card seller-card--form">
        <div className="seller-card__heading"><div className="seller-card__icon">◇</div><div><h2>Business identity</h2><p>Enter the legal details used for seller verification.</p></div></div>
        <form className="seller-form seller-form--profile" onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError(''); try { await api.post('/seller/register', { business_name: f.get('name'), business_type: f.get('type'), documents: [{ document_type: 'pan_card', document_url: f.get('document') }] }); const updated = await api.get('/seller/profile'); setProfile(updated.data.data); onSaved(); } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to submit application'); } finally { setBusy(false); } }}>
          <label className="seller-field"><span>Legal business name <b>*</b></span><input name="name" minLength={2} defaultValue={profile?.business_name} placeholder="e.g. Shopkeeper Retail Pvt. Ltd." required /><small>Use the name shown on your tax documents.</small></label>
          <label className="seller-field"><span>Business type <b>*</b></span><select name="type" defaultValue={profile?.business_type ?? ''} required><option value="" disabled>Select business type</option><option value="individual">Individual / Sole proprietor</option><option value="partnership">Partnership</option><option value="private_limited">Private limited company</option><option value="llp">Limited liability partnership</option><option value="other">Other</option></select></label>
          <label className="seller-field"><span>PAN document URL <b>*</b></span><div className="seller-upload-field"><span>↥</span><input name="document" type="url" defaultValue={profile?.documents?.find((d: any) => d.document_type === 'pan_card')?.document_url} placeholder="Paste a secure document URL" required /></div><small>PDF, JPG or PNG from your secure document storage.</small></label>
          <div className="seller-form-actions"><span>By submitting, you confirm these details are accurate.</span><button className="seller-btn seller-btn--primary" disabled={busy}>{busy ? 'Submitting…' : profile ? 'Update application' : 'Submit for review'}</button></div>
        </form>
      </div>

      <aside className="seller-card seller-review-card">
        <div className="seller-review-card__hero"><span>✓</span><h2>Review checklist</h2><p>Complete every item to prevent approval delays.</p></div>
        <ul><li className={profile?.business_name ? 'done' : ''}><span>{profile?.business_name ? '✓' : '1'}</span><div><b>Business information</b><small>Legal name and organization type</small></div></li><li className={profile?.documents?.length ? 'done' : ''}><span>{profile?.documents?.length ? '✓' : '2'}</span><div><b>Identity document</b><small>Readable PAN document</small></div></li><li className={profile?.location ? 'done' : ''}><span>{profile?.location ? '✓' : '3'}</span><div><b>Pickup location</b><small>Set the exact map pin in Location</small></div></li></ul>
        <div className="seller-security-note"><span>⌾</span><p><b>Your data is protected</b><br />Documents are only visible to authorized review staff.</p></div>
      </aside>
    </div>
  </section>;
}
