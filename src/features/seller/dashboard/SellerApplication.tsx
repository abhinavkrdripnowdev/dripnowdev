import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import api from '@/lib/api';
import { DocumentUpload, type UploadedDocument } from '@/components/ui/DocumentUpload/DocumentUpload';

export function SellerApplication({ onSaved }: { onSaved: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // File upload state
  const [fileData, setFileData] = useState<{ url: string; name: string; type: string; size?: string } | null>(null);

  useEffect(() => {
    api
      .get('/seller/profile')
      .then((r) => {
        const p = r.data.data;
        setProfile(p);
        const panDoc = p?.documents?.find((d: any) => d.document_type === 'pan_card');
        if (panDoc?.document_url) {
          setFileData({
            url: panDoc.document_url,
            name: panDoc.document_url.startsWith('data:')
              ? 'PAN_Identity_Document'
              : panDoc.document_url.split('/').pop() || 'PAN_Document',
            type: panDoc.document_url.includes('pdf') ? 'pdf' : 'image',
          });
        }
      })
      .catch(() => undefined);
  }, []);

  const uploaded: UploadedDocument | null = fileData
    ? { dataUrl: fileData.url, name: fileData.name, kind: fileData.type === 'pdf' ? 'pdf' : 'image', size: Math.round((fileData.url.length * 3) / 4) }
    : null;

  const status = String(profile?.status ?? 'draft').toLowerCase();

  return (
    <section className="seller-workspace">
      <header className="seller-page-header">
        <div>
          <span className="seller-eyebrow">Seller verification</span>
          <h1>Business profile</h1>
          <p>Complete your business details so customers and operations teams can trust every order.</p>
        </div>
        <span className={`seller-status seller-status--${status}`}>
          {status === 'draft' ? 'NOT SUBMITTED' : status.toUpperCase()}
        </span>
      </header>

      <div className="seller-onboarding-steps" aria-label="Application progress">
        <div className="seller-step seller-step--active">
          <span>1</span>
          <div>
            <b>Business details</b>
            <small>Identity and trading name</small>
          </div>
        </div>
        <i />
        <div className={fileData || profile?.documents?.length ? 'seller-step seller-step--active' : 'seller-step'}>
          <span>2</span>
          <div>
            <b>Documents</b>
            <small>PAN verification</small>
          </div>
        </div>
        <i />
        <div className={profile?.location ? 'seller-step seller-step--active' : 'seller-step'}>
          <span>3</span>
          <div>
            <b>Pickup location</b>
            <small>Warehouse coordinates</small>
          </div>
        </div>
        <i />
        <div className={status === 'approved' ? 'seller-step seller-step--active' : 'seller-step'}>
          <span>4</span>
          <div>
            <b>Review</b>
            <small>Admin approval</small>
          </div>
        </div>
      </div>

      {error && (
        <div className="seller-alert" role="alert">
          <span>!</span>
          <p>{error}</p>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {profile?.rejection_reason && (
        <div className="seller-alert">
          <span>!</span>
          <p>
            <b>Review note:</b> {profile.rejection_reason}
          </p>
        </div>
      )}

      <div className="seller-profile-layout">
        <div className="seller-card seller-card--form">
          <div className="seller-card__heading">
            <div className="seller-card__icon">◇</div>
            <div>
              <h2>Business identity</h2>
              <p>Enter the legal details used for seller verification.</p>
            </div>
          </div>
          <form
            className="seller-form seller-form--profile"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!fileData?.url) {
                setError('Please upload your PAN document or ID proof (PDF, PNG, or JPG)');
                return;
              }
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError('');
              try {
                await api.post('/seller/register', {
                  business_name: f.get('name'),
                  business_type: f.get('type'),
                  documents: [{ document_type: 'pan_card', document_url: fileData.url }],
                });
                const updated = await api.get('/seller/profile');
                setProfile(updated.data.data);
                onSaved();
              } catch (err: any) {
                setError(err.response?.data?.message ?? 'Unable to submit application');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="seller-field">
              <span>
                Legal business name <b>*</b>
              </span>
              <input
                name="name"
                minLength={2}
                defaultValue={profile?.business_name}
                placeholder="e.g. Shopkeeper Retail Pvt. Ltd."
                required
              />
              <small>Use the name shown on your tax documents.</small>
            </label>

            <label className="seller-field">
              <span>
                Business type <b>*</b>
              </span>
              <select name="type" defaultValue={profile?.business_type ?? ''} required>
                <option value="" disabled>
                  Select business type
                </option>
                <option value="individual">Individual / Sole proprietor</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private limited company</option>
                <option value="llp">Limited liability partnership</option>
                <option value="other">Other</option>
              </select>
            </label>

            <DocumentUpload
              label="PAN document / ID proof *"
              value={uploaded}
              onChange={(d) => { setError(''); setFileData(d ? { url: d.dataUrl, name: d.name, type: d.kind, size: `${(d.size / 1048576).toFixed(2)} MB` } : null); }}
              onError={setError}
              hint="Upload a clear PDF, PNG, or JPG of your PAN card or identity document for admin review."
            />

            <div className="seller-form-actions">
              <span>By submitting, you confirm these details are accurate.</span>
              <button className="seller-btn seller-btn--primary" disabled={busy}>
                {busy ? 'Submitting…' : profile ? 'Update application' : 'Submit for review'}
              </button>
            </div>
          </form>
        </div>

        <aside className="seller-card seller-review-card">
          <div className="seller-review-card__hero">
            <span><Icon name="tick" size={16} /></span>
            <h2>Review checklist</h2>
            <p>Complete every item to prevent approval delays.</p>
          </div>
          <ul>
            <li className={profile?.business_name ? 'done' : ''}>
              <span>{profile?.business_name ? <Icon name="tick" size={14} /> : '1'}</span>
              <div>
                <b>Business information</b>
                <small>Legal name and organization type</small>
              </div>
            </li>
            <li className={fileData || profile?.documents?.length ? 'done' : ''}>
              <span>{fileData || profile?.documents?.length ? <Icon name="tick" size={14} /> : '2'}</span>
              <div>
                <b>Identity document</b>
                <small>Readable PAN document uploaded</small>
              </div>
            </li>
            <li className={profile?.location ? 'done' : ''}>
              <span>{profile?.location ? <Icon name="tick" size={14} /> : '3'}</span>
              <div>
                <b>Pickup location</b>
                <small>Set the exact map pin in Location</small>
              </div>
            </li>
          </ul>
          <div className="seller-security-note">
            <span>⌾</span>
            <p>
              <b>Your data is protected</b>
              <br />
              Uploaded documents are encrypted and only visible to authorized review staff.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
