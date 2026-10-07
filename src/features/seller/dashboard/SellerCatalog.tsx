import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import api from '@/lib/api';

export function SellerCatalog() {
  const [products, setProducts] = useState<any[]>([]), [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  async function load() {
    const [p, c] = await Promise.all([api.get('/products/seller/my'), api.get('/products/categories')]);
    setProducts(p.data.data ?? []); setCategories(c.data.data ?? []);
  }
  useEffect(() => { load().catch(() => setError('Unable to load your catalog. Please refresh and try again.')); }, []);
  async function action(fn: () => Promise<unknown>) { setBusy(true); setError(''); try { await fn(); await load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to save changes'); } finally { setBusy(false); } }
  const variantCount = useMemo(() => products.reduce((sum, p) => sum + (p.variants?.length ?? 0), 0), [products]);
  const lowStock = useMemo(() => products.reduce((sum, p) => sum + (p.variants ?? []).filter((v: any) => Number(v.inventory?.quantity ?? 0) <= Number(v.inventory?.low_stock_threshold ?? 5)).length, 0), [products]);

  return <section className="seller-workspace">
    <header className="seller-page-header">
      <div><span className="seller-eyebrow">Catalog management</span><h1>Products & inventory</h1><p>Create products, organize variants and keep stock ready for every order.</p></div>
      <div className="seller-header-chip"><span>●</span> {products.length} products live</div>
    </header>

    <div className="seller-mini-stats">
      <div><span className="mini-stat-icon mini-stat-icon--violet"><Icon name="bag" size={18} /></span><p>Products</p><strong>{products.length}</strong></div>
      <div><span className="mini-stat-icon mini-stat-icon--blue"><Icon name="list" size={18} /></span><p>Variants</p><strong>{variantCount}</strong></div>
      <div><span className="mini-stat-icon mini-stat-icon--amber"><Icon name="alert" size={18} /></span><p>Low stock</p><strong>{lowStock}</strong></div>
    </div>

    {error && <div className="seller-alert" role="alert"><span><Icon name="alert" size={16} /></span><p>{error}</p><button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

    <div className="seller-card seller-card--form">
      <div className="seller-card__heading"><div className="seller-card__icon"><Icon name="plus" size={20} /></div><div><h2>{editing ? 'Edit product' : 'Add a new product'}</h2><p>{editing ? 'Update the details customers see in your store.' : 'Start with the essentials. You can add more variants and images later.'}</p></div>{editing && <button className="seller-link-btn" onClick={() => setEditing(null)}>Cancel editing</button>}</div>
      <form key={editing?.id ?? 'new'} className="seller-form" onSubmit={e => {
        e.preventDefault(); const form = new FormData(e.currentTarget);
        const body = { name: form.get('name'), description: form.get('description'), category_id: Number(form.get('category')), base_price: Number(form.get('price')) };
        void action(async () => { if (editing) await api.put(`/products/${editing.id}`, body); else await api.post('/products', { ...body, variants: [{ sku: form.get('sku'), size: form.get('size') || undefined, color: form.get('color') || undefined, initial_quantity: Number(form.get('quantity')) }], images: form.get('image') ? [{ image_url: form.get('image') }] : [] }); setEditing(null); });
      }}>
        <div className="seller-form-section">
          <div className="seller-form-section__title"><span>01</span><div><h3>Product details</h3><p>Use a clear title and useful description.</p></div></div>
          <div className="seller-form-grid">
            <label className="seller-field seller-field--wide"><span>Product name <b>*</b></span><input name="name" defaultValue={editing?.name} minLength={2} placeholder="e.g. Relaxed cotton T-shirt" required /></label>
            <label className="seller-field seller-field--wide"><span>Description</span><textarea name="description" defaultValue={editing?.description} rows={4} placeholder="Describe the material, fit and key details…" /></label>
            <label className="seller-field"><span>Category <b>*</b></span><select name="category" defaultValue={editing?.category_id} required><option value="" disabled>Select a category</option>{categories.filter(c => !c.parent_id).map(parent => { const kids = categories.filter(c => c.parent_id === parent.id); return kids.length ? <optgroup key={parent.id} label={parent.name}><option value={parent.id}>All {parent.name}</option>{kids.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup> : <option key={parent.id} value={parent.id}>{parent.name}</option>; })}</select></label>
            <label className="seller-field"><span>Base price <b>*</b></span><div className="seller-input-prefix"><i>₹</i><input name="price" type="number" min="0.01" step="0.01" defaultValue={editing?.base_price} placeholder="0.00" required /></div><small>Taxes and platform charges are calculated at checkout.</small></label>
          </div>
          {!categories.length && <p className="seller-inline-note">An administrator must add a category before a product can be created.</p>}
        </div>

        {!editing && <div className="seller-form-section">
          <div className="seller-form-section__title"><span>02</span><div><h3>First variant & stock</h3><p>Create the first purchasable option for this product.</p></div></div>
          <div className="seller-form-grid seller-form-grid--three">
            <label className="seller-field"><span>SKU <b>*</b></span><input name="sku" minLength={3} placeholder="TSHIRT-BLK-M" required /><small>Unique stock keeping unit</small></label>
            <label className="seller-field"><span>Size</span><input name="size" placeholder="e.g. M" /></label>
            <label className="seller-field"><span>Color</span><input name="color" placeholder="e.g. Midnight black" /></label>
            <label className="seller-field"><span>Opening stock <b>*</b></span><input name="quantity" type="number" min="0" step="1" defaultValue="0" required /></label>
            <label className="seller-field seller-field--span-two"><span>Primary image URL</span><input name="image" type="url" placeholder="https://…" /><small>Use a square, high-resolution product image.</small></label>
          </div>
        </div>}
        <div className="seller-form-actions"><span>Products are reviewed before appearing in the storefront.</span><button className="seller-btn seller-btn--primary" disabled={busy || !categories.length}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button></div>
      </form>
    </div>

    <div className="seller-section-bar"><div><h2>Your catalog</h2><p>Manage product visibility, images and stock.</p></div><span>{products.length} total</span></div>
    {!products.length ? <div className="seller-empty"><div><Icon name="box" size={28} /></div><h3>Your catalog is empty</h3><p>Create your first product above to begin selling.</p></div> : <div className="seller-product-grid">{products.map(p => {
      const primary = p.images?.find((img: any) => img.is_primary) ?? p.images?.[0];
      const stock = (p.variants ?? []).reduce((sum: number, v: any) => sum + Number(v.inventory?.quantity ?? 0), 0);
      return <article className="seller-product-card" key={p.id}>
        <div className="seller-product-card__media">{primary ? <img src={primary.image_url} alt={p.name} /> : <span><Icon name="bag" size={16} /></span>}<span className={`seller-status seller-status--${String(p.moderation_status ?? 'approved').toLowerCase()}`}>{p.moderation_status ?? 'APPROVED'}</span></div>
        <div className="seller-product-card__body"><div className="seller-product-card__top"><div><h3>{p.name}</h3><p>{p.category?.name ?? 'Uncategorized'}</p></div><strong>₹{Number(p.base_price).toFixed(2)}</strong></div>
          <div className="seller-product-meta"><span><b>{p.variants?.length ?? 0}</b> variants</span><span><b>{stock}</b> in stock</span><span>{p.is_active ? 'Visible' : 'Hidden'}</span></div>
          <div className="seller-product-actions"><button className="seller-btn seller-btn--soft" disabled={busy} onClick={() => { setEditing(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button><button className="seller-btn seller-btn--soft" disabled={busy} onClick={() => void action(() => api.put(`/products/${p.id}`, { is_active: !p.is_active }))}>{p.is_active ? 'Hide' : 'Show'}</button><button className="seller-icon-btn seller-icon-btn--danger" aria-label={`Discontinue ${p.name}`} disabled={busy} onClick={() => void action(() => api.delete(`/products/${p.id}`))}>×</button></div>
          <details className="seller-details"><summary>Manage inventory & media <span><Icon name="chevron" size={14} /></span></summary><div className="seller-details__content">
            <form className="seller-inline-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.post(`/products/${p.id}/images`, { image_url: f.get('image') })); }}><label className="seller-field"><span>Add image URL</span><input name="image" type="url" placeholder="https://…" required /></label><button className="seller-btn seller-btn--soft" disabled={busy}>Add image</button></form>
            <div className="seller-variant-list">{p.variants?.map((v: any) => <form className="seller-variant-row" key={v.id} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.put(`/products/variants/${v.id}/inventory`, { quantity: Number(f.get('quantity')) })); }}><div><strong>{v.sku}</strong><small>{[v.size, v.color].filter(Boolean).join(' · ') || 'Default variant'}</small></div><label>Stock<input name="quantity" aria-label={`Stock for ${v.sku}`} type="number" min="0" step="1" defaultValue={v.inventory?.quantity ?? 0} required /></label><button className="seller-btn seller-btn--soft" disabled={busy}>Update</button></form>)}</div>
            <details className="seller-add-variant"><summary>＋ Add another variant</summary><form className="seller-form-grid seller-form-grid--three" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => api.post(`/products/${p.id}/variants`, { sku: f.get('sku'), size: f.get('size') || undefined, color: f.get('color') || undefined, initial_quantity: Number(f.get('stock')) })); }}><label className="seller-field"><span>SKU</span><input name="sku" required minLength={3} /></label><label className="seller-field"><span>Size</span><input name="size" /></label><label className="seller-field"><span>Color</span><input name="color" /></label><label className="seller-field"><span>Stock</span><input name="stock" type="number" min="0" defaultValue="0" required /></label><button className="seller-btn seller-btn--primary" disabled={busy}>Add variant</button></form></details>
          </div></details>
        </div>
      </article>;
    })}</div>}
  </section>;
}
