import { useEffect, useState } from 'react';
import api from '@/lib/api';
export function SellerOffers() {
  const [offers, setOffers] = useState<any[]>([]), [combos, setCombos] = useState<any[]>([]), [products, setProducts] = useState<any[]>([]), [error, setError] = useState('');
  async function load() { const [a,b,c] = await Promise.all([api.get('/offers/seller'), api.get('/offers/combo/seller'), api.get('/products/seller/my')]); setOffers(a.data.data); setCombos(b.data.data); setProducts(c.data.data); }
  useEffect(() => { load().catch(() => setError('Unable to load offers')); }, []);
  async function save(path: string, body: object) { try { await api.post(path, body); setError(''); await load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to create offer'); } }
  return <section className="operations-panel" style={{ padding: 20 }}><h2>Offers and coupons</h2>{error && <p role="alert">{error}</p>}
    <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void save('/offers', { title: f.get('title'), offer_type: f.get('type'), discount_value: Number(f.get('value')), code: f.get('code') || undefined, min_order_value: Number(f.get('minimum')) }); }}>
      <label>Title <input name="title" minLength={2} required /></label><label>Type <select name="type"><option value="percentage">Percentage</option><option value="flat">Flat discount</option><option value="special_price">Special basket price</option></select></label>
      <label>Value <input name="value" type="number" step="0.01" min="0.01" required /></label><label>Minimum basket ₹ <input name="minimum" type="number" min="0" defaultValue="0" required /></label><label>Coupon code (leave empty for automatic discount) <input name="code" /></label><button>Create offer</button>
    </form>
    {offers.map(o => <p key={o.id}>{o.title} · {o.offer_type} {o.discount_value} · {o.code || 'Automatic'}</p>)}
    <h3>Combo offers</h3><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void save('/offers/combo', { name: f.get('name'), combo_price: Number(f.get('price')), items: f.getAll('products').map(id => ({ product_id: id })) }); }}>
      <label>Name <input name="name" minLength={2} required /></label><label>Combo price ₹ <input name="price" type="number" min="0.01" step="0.01" required /></label>
      <fieldset><legend>Select at least two products</legend>{products.map(p => <label key={p.id}><input type="checkbox" name="products" value={p.id} />{p.name}</label>)}</fieldset><button>Create combo</button>
    </form>{combos.map(c => <p key={c.id}>{c.name} · ₹{c.combo_price}</p>)}
  </section>;
}
