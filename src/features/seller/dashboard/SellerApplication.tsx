import { useState } from 'react';
import api from '@/lib/api';
export function SellerApplication({ onSaved }: { onSaved: () => void }) {
  const [error, setError] = useState('');
  return <section className="operations-panel" style={{ padding: 20 }}><h2>Business profile and documents</h2><p>Submit business details, then save a pickup location for admin review.</p>{error && <p role="alert">{error}</p>}
    <form onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); try { await api.post('/seller/register', { business_name: f.get('name'), business_type: f.get('type'), documents: [{ document_type: 'pan_card', document_url: f.get('document') }] }); onSaved(); } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to submit application'); } }}>
      <label>Business name <input name="name" minLength={2} required /></label><label>Business type <input name="type" required /></label><label>PAN document URL <input name="document" type="url" required /></label><button>Submit for review</button>
    </form></section>;
}
