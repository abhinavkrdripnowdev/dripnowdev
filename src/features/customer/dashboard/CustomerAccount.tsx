import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import './CustomerAccount.css';

type Destination = 'shop' | 'orders' | 'wishlist' | 'addresses' | 'profile';
export function CustomerAccount({ orders, addresses, wishlist, onNavigate }: {
  orders: number; addresses: number; wishlist: number; onNavigate: (page: Destination) => void;
}) {
  const { user, updateUser, clearAuth } = useAuthStore();
  const [name, setName] = useState(user?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => { setName(user?.full_name ?? ''); }, [user?.full_name]);
  const initials = user?.full_name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'D';
  const changed = name.trim() !== user?.full_name;
  if (!user) return <section className="account-page"><h1>Your account</h1><p>Sign in to manage your profile, orders and saved addresses.</p><a className="account-primary" href="/login">Sign in</a></section>;
  return <section className="account-page">
    <div className="account-breadcrumb"><button onClick={() => onNavigate('shop')}>Home</button><span>/</span><span>My account</span></div>
    <header className="account-heading"><div><span className="account-eyebrow">YOUR DRIPNOW SPACE</span><h1>My account<span>.</span></h1><p>A little about you. Everything you need for your next drop.</p></div><button className="account-back" onClick={() => onNavigate('shop')}>Continue shopping ↗</button></header>
    <div className="account-layout">
      <aside className="account-sidebar">
        <div className="account-identity"><div className="account-avatar">{initials}</div><h2>{user.full_name}</h2><p>{user.username ? `@${user.username}` : 'DripNow customer'}</p><span className="account-member">CUSTOMER ACCOUNT</span></div>
        <nav aria-label="Account navigation">
          <button className="is-selected" aria-current="page"><span><Icon name="user" size={18} /></span>Personal details<i><Icon name="arrow" size={13} /></i></button>
          <button onClick={() => onNavigate('orders')}><span>⌑</span>My orders<i>{orders}</i></button>
          <button onClick={() => onNavigate('addresses')}><span>⌖</span>Saved addresses<i>{addresses}</i></button>
          <button onClick={() => onNavigate('wishlist')}><span><Icon name="heart" size={18} /></span>Wishlist<i>{wishlist}</i></button>
        </nav>
        <button className="account-signout" onClick={async () => { try { await api.post('/auth/logout'); } finally { clearAuth(); window.location.href = '/'; } }}>↪ <span>Log out</span></button>
      </aside>
      <div className="account-content">
        <div className="account-welcome"><div><span className="account-eyebrow">GOOD TO SEE YOU</span><h2>Hey, {user.full_name.split(' ')[0]}</h2><p>Your next favourite is just a few taps away.</p></div><span className="account-welcome-art" aria-hidden="true"><Icon name="spark" size={78} /></span></div>
        <section className="account-panel">
          <header className="account-panel-heading"><div><h2>Personal details</h2><p>Make your account feel more like you.</p></div><span className="account-section-icon" aria-hidden="true"><Icon name="user" size={20} /></span></header>
          <form onSubmit={async event => {
            event.preventDefault(); if (saving || !changed) return;
            setSaving(true); setFeedback(''); setFailed(false);
            try { const full_name = name.trim(); await api.put('/customer/profile', { full_name }); updateUser({ full_name }); setFeedback('Your profile has been updated.'); }
            catch (error: any) { setFailed(true); setFeedback(error.response?.data?.message || 'Unable to save your profile. Please try again.'); }
            finally { setSaving(false); }
          }}>
            <div className="account-fields"><label>Full name<input name="name" autoComplete="name" value={name} minLength={2} maxLength={100} required onChange={event => { setName(event.target.value); setFeedback(''); }} /></label><label>Username<input value={user.username ? `@${user.username}` : 'Not set'} readOnly aria-describedby="account-handle-help"/><small id="account-handle-help">Your unique DripNow identity.</small></label></div>
            {feedback && <p className={`account-feedback ${failed ? 'is-error' : ''}`} role={failed ? 'alert' : 'status'}>{feedback}</p>}
            <div className="account-form-footer"><span>Only your display name is editable here.</span><button className="account-primary" disabled={saving || !changed || name.trim().length < 2}>{saving ? 'Saving…' : 'Save changes'}</button></div>
          </form>
        </section>
        <section className="account-panel">
          <header className="account-panel-heading"><div><h2>Contact & security</h2><p>Your verified details help keep your account secure.</p></div><span className="account-section-icon" aria-hidden="true">◈</span></header>
          <div className="account-contact-row"><span className="account-contact-icon"><Icon name="at" size={17} /></span><div><small>Email address</small><strong>{user.email || 'Not provided'}</strong></div><span className={`account-verified ${user.email_verified ? '' : 'is-pending'}`}>{user.email_verified ? 'Verified' : 'Unverified'}</span></div>
          <div className="account-contact-row"><span className="account-contact-icon"><Icon name="phone" size={17} /></span><div><small>Phone number</small><strong>{user.phone || 'Not provided'}</strong></div><span className={`account-verified ${user.phone_verified ? '' : 'is-pending'}`}>{user.phone_verified ? 'Verified' : 'Unverified'}</span></div>
          <div className="account-security-footer"><div><strong>Password & account access</strong><p>Reset your password through your registered email.</p></div><a href="/forgot-password">Change password ↗</a></div>
        </section>
        <div className="account-shortcuts"><button onClick={() => onNavigate('addresses')}><span className="account-shortcut-icon">⌖</span><span><strong>Your delivery spots</strong><small>{addresses} saved {addresses === 1 ? 'address' : 'addresses'} · Manage where your orders arrive</small></span><i><Icon name="arrow" size={14} /></i></button><button onClick={() => onNavigate('orders')}><span className="account-shortcut-icon">⌑</span><span><strong>Every order, in one place</strong><small>Track deliveries and view your purchase history</small></span><i><Icon name="arrow" size={14} /></i></button></div>
      </div>
    </div>
  </section>;
}
