import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import api from '@/lib/api';

export function SellerOffers() {
  const [offers, setOffers] = useState<any[]>([]), [combos, setCombos] = useState<any[]>([]), [products, setProducts] = useState<any[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [offerType, setOfferType] = useState('percentage');
  async function load() { const [a,b,c] = await Promise.all([api.get('/offers/seller'), api.get('/offers/combo/seller'), api.get('/products/seller/my')]); setOffers(a.data.data ?? []); setCombos(b.data.data ?? []); setProducts(c.data.data ?? []); }
  useEffect(() => { load().catch(() => setError('Unable to load your promotions.')); }, []);
  async function save(path: string, body: object) { setBusy(true); try { await api.post(path, body); setError(''); await load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to create promotion'); } finally { setBusy(false); } }

  return <section className="seller-workspace">
    <header className="seller-page-header"><div><span className="seller-eyebrow">Growth tools</span><h1>Offers & coupons</h1><p>Build promotions that move inventory without losing control of your pricing.</p></div><div className="seller-header-chip seller-header-chip--warm"><span><Icon name="spark" size={14} /></span> {offers.length + combos.length} active campaigns</div></header>
    <div className="seller-mini-stats"><div><span className="mini-stat-icon mini-stat-icon--violet"><Icon name="tag" size={18} /></span><p>Discounts</p><strong>{offers.length}</strong></div><div><span className="mini-stat-icon mini-stat-icon--blue"><Icon name="list" size={18} /></span><p>Combos</p><strong>{combos.length}</strong></div><div><span className="mini-stat-icon mini-stat-icon--amber"><Icon name="list" size={18} /></span><p>Coupon codes</p><strong>{offers.filter(o => o.code).length}</strong></div></div>
    {error && <div className="seller-alert" role="alert"><span><Icon name="alert" size={16} /></span><p>{error}</p><button onClick={() => setError('')}>×</button></div>}

    <div className="seller-promo-layout">
      <div className="seller-card seller-card--form">
        <div className="seller-card__heading"><div className="seller-card__icon seller-card__icon--pink"><Icon name="tag" size={20} /></div><div><h2>Create a discount</h2><p>Apply automatically or share a coupon code.</p></div></div>
        <form className="seller-form seller-form--compact" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void save('/offers', { title: f.get('title'), offer_type: f.get('type'), discount_value: Number(f.get('value')), code: f.get('code') || undefined, min_order_value: Number(f.get('minimum')) }); }}>
          <label className="seller-field seller-field--wide"><span>Campaign title <b>*</b></span><input name="title" minLength={2} placeholder="e.g. Weekend wardrobe sale" required /></label>
          <div className="seller-form-grid"><label className="seller-field"><span>Discount type</span><select name="type" value={offerType} onChange={e => setOfferType(e.target.value)}><option value="percentage">Percentage off</option><option value="flat">Flat discount</option><option value="special_price">Special basket price</option></select></label><label className="seller-field"><span>{offerType === 'percentage' ? 'Percentage' : 'Amount'} <b>*</b></span><div className="seller-input-prefix"><i>{offerType === 'percentage' ? '%' : '₹'}</i><input name="value" type="number" step="0.01" min="0.01" placeholder="0" required /></div></label></div>
          <div className="seller-form-grid"><label className="seller-field"><span>Minimum basket</span><div className="seller-input-prefix"><i>₹</i><input name="minimum" type="number" min="0" defaultValue="0" required /></div></label><label className="seller-field"><span>Coupon code</span><input name="code" placeholder="e.g. WEEKEND20" /><small>Leave empty to apply automatically.</small></label></div>
          <div className="seller-tip"><span>i</span><p>The best eligible seller offer is applied. Offers never stack against each other.</p></div>
          <button className="seller-btn seller-btn--primary seller-btn--wide" disabled={busy}>{busy ? 'Creating…' : 'Create discount'}</button>
        </form>
      </div>

      <div className="seller-card seller-card--form">
        <div className="seller-card__heading"><div className="seller-card__icon seller-card__icon--blue"><Icon name="list" size={20} /></div><div><h2>Build a combo</h2><p>Bundle two or more products at one price.</p></div></div>
        <form className="seller-form seller-form--compact" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void save('/offers/combo', { name: f.get('name'), combo_price: Number(f.get('price')), items: f.getAll('products').map(id => ({ product_id: id })) }); }}>
          <label className="seller-field"><span>Combo name <b>*</b></span><input name="name" minLength={2} placeholder="e.g. Everyday essentials" required /></label>
          <label className="seller-field"><span>Combo price <b>*</b></span><div className="seller-input-prefix"><i>₹</i><input name="price" type="number" min="0.01" step="0.01" placeholder="0.00" required /></div></label>
          <fieldset className="seller-product-picker"><legend>Choose at least two products</legend>{products.length ? products.map(p => <label key={p.id}><input type="checkbox" name="products" value={p.id} /><span className="seller-picker-thumb">{p.images?.[0] ? <img src={p.images[0].image_url} alt="" /> : '◇'}</span><span><b>{p.name}</b><small>₹{Number(p.base_price).toFixed(2)}</small></span></label>) : <p>Add products to your catalog before creating a combo.</p>}</fieldset>
          <button className="seller-btn seller-btn--primary seller-btn--wide" disabled={busy || products.length < 2}>{busy ? 'Creating…' : 'Create combo offer'}</button>
        </form>
      </div>
    </div>

    <div className="seller-section-bar"><div><h2>Active promotions</h2><p>All live discounts and product bundles.</p></div><span>{offers.length + combos.length} campaigns</span></div>
    {!offers.length && !combos.length ? <div className="seller-empty"><div><Icon name="spark" size={28} /></div><h3>No promotions yet</h3><p>Create a discount or combo to attract your first customers.</p></div> : <div className="seller-offer-grid">
      {offers.map(o => <article className="seller-offer-card" key={o.id}><div className="seller-offer-card__icon">{o.offer_type === 'percentage' ? '%' : '₹'}</div><div className="seller-offer-card__body"><div><span className="seller-status seller-status--approved">ACTIVE</span>{o.code && <code>{o.code}</code>}</div><h3>{o.title}</h3><p>{o.offer_type === 'percentage' ? `${Number(o.discount_value)}% off` : o.offer_type === 'special_price' ? `Basket at ₹${Number(o.discount_value).toFixed(2)}` : `₹${Number(o.discount_value).toFixed(2)} off`} · Minimum ₹{Number(o.min_order_value).toFixed(2)}</p></div></article>)}
      {combos.map(c => <article className="seller-offer-card seller-offer-card--combo" key={c.id}><div className="seller-offer-card__icon"><Icon name="tag" size={20} /></div><div className="seller-offer-card__body"><div><span className="seller-status seller-status--approved">COMBO</span></div><h3>{c.name}</h3><p>Bundle price ₹{Number(c.combo_price).toFixed(2)}</p></div></article>)}
    </div>}
  </section>;
}
