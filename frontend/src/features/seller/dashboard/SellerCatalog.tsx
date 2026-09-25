import { useEffect, useState } from 'react';
import api from '@/lib/api';
export function SellerCatalog() {
  const [products, setProducts] = useState<any[]>([]), [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  async function load() {
    const [p, c] = await Promise.all([api.get('/products/seller/my'), api.get('/products/categories')]);
    setProducts(p.data.data); setCategories(c.data.data);
  }
  useEffect(() => { load().catch(() => setError('Unable to load catalog')); }, []);
  async function action(fn: () => Promise<unknown>) { setBusy(true); setError(''); try { await fn(); await load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to save changes'); } finally { setBusy(false); } }
  return <section className="operations-panel" style={{ padding: 20 }}><h2>Products and inventory</h2>{error && <p role="alert">{error}</p>}
    <form key={editing?.id ?? 'new'} onSubmit={e => {
      e.preventDefault(); const form = new FormData(e.currentTarget);
      const body = { name: form.get('name'), description: form.get('description'), category_id: Number(form.get('category')), base_price: Number(form.get('price')) };
      void action(async () => {
        if (editing) await api.put(`/products/${editing.id}`, body);
        else await api.post('/products', { ...body, variants: [{ sku: form.get('sku'), size: form.get('size') || undefined, color: form.get('color') || undefined, initial_quantity: Number(form.get('quantity')) }], images: form.get('image') ? [{ image_url: form.get('image') }] : [] });
        setEditing(null);
      });
    }} style={{ display: 'grid', gap: 10, maxWidth: 640 }}>
      <h3>{editing ? 'Edit product' : 'Create product'}</h3>
      <label>Name <input name="name" defaultValue={editing?.name} minLength={2} required /></label>
      <label>Description <textarea name="description" defaultValue={editing?.description} /></label>
      <label>Category <select name="category" defaultValue={editing?.category_id} required>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {!categories.length && <p>An administrator must add a category before products can be created.</p>}
      <label>Base price ₹ <input name="price" type="number" min="0.01" step="0.01" defaultValue={editing?.base_price} required /></label>
      {!editing && <><label>SKU <input name="sku" minLength={3} required /></label><label>Size <input name="size" /></label><label>Color <input name="color" /></label><label>Stock <input name="quantity" type="number" min="0" step="1" defaultValue="0" required /></label><label>Image URL <input name="image" type="url" /></label></>}
      <p>Platform charges are calculated at checkout.</p><button disabled={busy || !categories.length}>Save product</button>{editing && <button type="button" onClick={() => setEditing(null)}>Cancel edit</button>}
    </form>
    {products.map(p => <article key={p.id} style={{ padding: 16, borderBottom: '1px solid #666' }}><h3>{p.name} · ₹{Number(p.base_price).toFixed(2)}</h3><p>{p.is_active ? p.availability_status : 'Hidden'}</p>
      <button disabled={busy} onClick={() => setEditing(p)}>Edit</button>{' '}<button disabled={busy} onClick={() => void action(() => api.put(`/products/${p.id}`, { is_active: !p.is_active }))}>{p.is_active ? 'Hide' : 'Show'}</button>{' '}
      <button disabled={busy} onClick={() => void action(() => api.delete(`/products/${p.id}`))}>Discontinue</button>
      {p.images?.map((img: any) => <img key={img.id} src={img.image_url} alt={p.name} width={80} />)}
      <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.post(`/products/${p.id}/images`, { image_url: f.get('image') })); }}><label>Add image URL <input name="image" type="url" required /></label><button disabled={busy}>Add image</button></form>
      {p.variants?.map((v: any) => <form key={v.id} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.put(`/products/variants/${v.id}/inventory`, { quantity: Number(f.get('quantity')) })); }}>
        <label>{v.sku} · {v.size} {v.color} · Stock <input name="quantity" aria-label={`Stock for ${v.sku}`} type="number" min="0" step="1" defaultValue={v.inventory?.quantity ?? 0} required /></label><button disabled={busy}>Update stock</button>
      </form>)}
      <details><summary>Add variant</summary><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.post(`/products/${p.id}/variants`, { sku: f.get('sku'), size: f.get('size') || undefined, color: f.get('color') || undefined, initial_quantity: Number(f.get('stock')) })); }}>
        <label>SKU <input name="sku" required minLength={3} /></label><label>Size <input name="size" /></label><label>Color <input name="color" /></label><label>Stock <input name="stock" type="number" min="0" defaultValue="0" required /></label><button disabled={busy}>Add variant</button>
      </form></details>
    </article>)}
  </section>;
}
