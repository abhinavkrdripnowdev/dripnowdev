import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';

export function SellerApplication({ onSaved }: { onSaved: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // File upload state
  const [fileData, setFileData] = useState<{ url: string; name: string; type: string; size?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please upload a smaller PDF or image.');
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg)$/i)) {
      setError('Invalid file format. Only PDF, PNG, and JPG files are supported.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileData({
        url: reader.result as string,
        name: file.name,
        type: file.type.includes('pdf') || file.name.endsWith('.pdf') ? 'pdf' : 'image',
        size: `${sizeMB} MB`,
      });
    };
    reader.readAsDataURL(file);
  };

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

            {/* ── File Upload Field ── */}
            <div className="seller-field">
              <span>
                PAN document / ID proof <b>*</b>
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {!fileData ? (
                <div
                  className={`seller-dropzone ${isDragging ? 'seller-dropzone--active' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                >
                  <div className="seller-dropzone__icon">📄</div>
                  <div className="seller-dropzone__text">
                    <strong>Click to upload PDF / image</strong> or drag and drop
                  </div>
                  <small>Supports PDF, PNG, or JPG (Up to 10MB)</small>
                </div>
              ) : (
                <div className="seller-file-preview">
                  <div className="seller-file-preview__thumb">
                    {fileData.type === 'image' && fileData.url.startsWith('data:') ? (
                      <img src={fileData.url} alt="Document preview" />
                    ) : (
                      <span>{fileData.type === 'pdf' ? '📄' : '🖼️'}</span>
                    )}
                  </div>
                  <div className="seller-file-preview__details">
                    <b className="seller-file-name">{fileData.name}</b>
                    <small>{fileData.size ? fileData.size : fileData.type.toUpperCase() + ' Document'}</small>
                  </div>
                  <div className="seller-file-preview__actions">
                    <button
                      type="button"
                      className="seller-btn seller-btn--soft"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change file
                    </button>
                    <button
                      type="button"
                      className="seller-icon-btn seller-icon-btn--danger"
                      onClick={() => {
                        setFileData(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      title="Remove document"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              <small>Upload a clear PDF, PNG, or JPG file of your PAN card or identity document for admin review.</small>
            </div>

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
            <span>✓</span>
            <h2>Review checklist</h2>
            <p>Complete every item to prevent approval delays.</p>
          </div>
          <ul>
            <li className={profile?.business_name ? 'done' : ''}>
              <span>{profile?.business_name ? '✓' : '1'}</span>
              <div>
                <b>Business information</b>
                <small>Legal name and organization type</small>
              </div>
            </li>
            <li className={fileData || profile?.documents?.length ? 'done' : ''}>
              <span>{fileData || profile?.documents?.length ? '✓' : '2'}</span>
              <div>
                <b>Identity document</b>
                <small>Readable PAN document uploaded</small>
              </div>
            </li>
            <li className={profile?.location ? 'done' : ''}>
              <span>{profile?.location ? '✓' : '3'}</span>
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
