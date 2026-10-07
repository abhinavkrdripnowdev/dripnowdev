import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import api from '@/lib/api';
import { ProductCard } from './ProductCard';
import { findNode } from '../catalog';
import { inr, productCategoryName, productCategorySlug, variantStock, type Product, type ProductVariant } from '../types';
import type { Store } from './StoresMap';
import './ProductPage.css';

interface Props {
  productId: string;
  products: Product[];
  stores: Store[];
  wishlistIds: Set<string>;
  busy: boolean;
  onWish: (p: Product) => void;
  onAdd: (p: Product, variantId: string | undefined, qty: number, buyNow?: boolean) => void;
  onOpen: (p: Product) => void;
  onBack: () => void;
  onCategory: (slug?: string, sub?: string) => void;
  onStore: (storeId: string) => void;
  onStoresMap: () => void;
}

const RECENT_KEY = 'dripnow-recent';
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };

const uniq = <T,>(xs: (T | undefined | null)[]) => [...new Set(xs.filter((x): x is T => x != null && x !== ('' as unknown as T)))];

export const ProductPage: React.FC<Props> = ({ productId, products, stores, wishlistIds, busy, onWish, onAdd, onOpen, onBack, onCategory, onStore, onStoresMap }) => {
  const [product, setProduct] = useState<Product | null>(() => products.find((p) => p.id === productId) ?? null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(product ? 'ready' : 'loading');
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'description' | 'details' | 'delivery'>('description');
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const stage = useRef<HTMLDivElement>(null);

  // Load the full product (variants + inventory + all images) whenever the id changes.
  useEffect(() => {
    let active = true;
    setImgIdx(0); setSize(''); setColor(''); setQty(1); setTab('description'); setZoom(null);
    const cached = products.find((p) => p.id === productId) ?? null;
    setProduct(cached); setState(cached ? 'ready' : 'loading');
    api.get(`/products/${productId}`)
      .then((r) => { if (active) { setProduct(r.data.data); setState('ready'); } })
      .catch(() => { if (active && !cached) setState('missing'); });
    window.scrollTo({ top: 0 });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (state !== 'ready') return;
    const prior = readRecent().filter((id) => id !== productId);
    setRecent(prior.slice(0, 8));
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([productId, ...prior].slice(0, 12))); } catch { /* ignore */ }
  }, [productId, state]);

  const variants = useMemo<ProductVariant[]>(() => (product?.variants ?? []).filter((v) => (v as { is_active?: unknown }).is_active !== 0), [product]);
  const sizes = useMemo(() => uniq(variants.map((v) => v.size)), [variants]);
  const colors = useMemo(() => uniq(variants.map((v) => v.color)), [variants]);

  // Pre-select the first in-stock option so the page is purchasable immediately.
  useEffect(() => {
    if (!variants.length || size || color) return;
    const first = variants.find((v) => variantStock(v) > 0) ?? variants[0];
    if (first.size) setSize(first.size);
    if (first.color) setColor(first.color);
  }, [variants, size, color]);

  const selected = variants.find((v) => (!sizes.length || v.size === size) && (!colors.length || v.color === color));
  const price = selected?.price_override != null ? Number(selected.price_override) : Number(product?.base_price ?? 0);
  const stock = selected ? variantStock(selected) : 0;
  const optionInStock = (key: 'size' | 'color', value: string) => variants.some((v) => v[key] === value && (key === 'size' ? !color || v.color === color : !size || v.size === size) && variantStock(v) > 0);
  const store = stores.find((s) => s.id === product?.seller_id);
  const catSlug = product ? productCategorySlug(product) : '';
  const parentNode = findNode(catSlug.split('-')[0]);
  const subNode = parentNode?.subs.find((s) => `${parentNode.slug}-${s.slug}` === catSlug);

  const related = useMemo(() => {
    if (!product) return [];
    const dept = catSlug.split('-')[0];
    const same = products.filter((p) => p.id !== product.id && productCategorySlug(p) === catSlug);
    const near = products.filter((p) => p.id !== product.id && productCategorySlug(p).split('-')[0] === dept && !same.includes(p));
    const rest = products.filter((p) => p.id !== product.id && !same.includes(p) && !near.includes(p));
    return [...same, ...near, ...rest].slice(0, 4);
  }, [products, product, catSlug]);
  const recentProducts = recent.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p).slice(0, 4);

  const storeName = (id: string) => stores.find((s) => s.id === id)?.business_name;

  if (state === 'loading') {
    return <div className="pdp pdp--loading" aria-busy="true"><div className="pdp-skel pdp-skel--img" /><div className="pdp-skel-col"><div className="pdp-skel" /><div className="pdp-skel pdp-skel--short" /><div className="pdp-skel pdp-skel--block" /></div></div>;
  }
  if (state === 'missing' || !product) {
    return <div className="pdp pdp--empty"><span>◌</span><h2>This product is no longer available</h2><p>It may have been removed or is awaiting approval.</p><button className="sl-btn sl-btn--dark" onClick={onBack}>Back to shopping</button></div>;
  }

  const images = product.images?.length ? product.images : [{ image_url: '/favicon.svg' }];
  const canBuy = variants.length === 0 ? false : Boolean(selected) && stock > 0;
  const needsOptions = variants.length > 0 && !selected;
  const maxQty = Math.max(1, Math.min(stock || 1, 10));
  const wished = wishlistIds.has(product.id);
  const share = async () => {
    const data = { title: product.name, url: window.location.href };
    try { if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(data.url); } catch { /* user cancelled */ }
  };

  return (
    <article className="pdp" aria-labelledby="pdp-title">
      <nav className="cat-crumbs pdp__crumbs" aria-label="Breadcrumb">
        <button onClick={onBack}>Home</button>
        {parentNode && <><span>/</span><button onClick={() => onCategory(parentNode.slug)}>{parentNode.label}</button></>}
        {parentNode && subNode && <><span>/</span><button onClick={() => onCategory(parentNode.slug, subNode.slug)}>{subNode.label}</button></>}
        {!parentNode && productCategoryName(product) && <><span>/</span><b>{productCategoryName(product)}</b></>}
        <span>/</span><b className="pdp__crumb-current">{product.name}</b>
      </nav>

      <div className="pdp__grid">
        <section className="pdp__gallery" aria-label="Product images">
          {images.length > 1 && (
            <ul className="pdp__thumbs">
              {images.map((img, i) => (
                <li key={img.image_url + i}><button className={i === imgIdx ? 'is-active' : ''} onClick={() => setImgIdx(i)} aria-label={`Image ${i + 1}`}><img src={img.image_url} alt="" loading="lazy" /></button></li>
              ))}
            </ul>
          )}
          <div
            ref={stage}
            className={`pdp__stage ${zoom ? 'is-zoom' : ''}`}
            onMouseMove={(e) => { const r = stage.current?.getBoundingClientRect(); if (r) setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
            onMouseLeave={() => setZoom(null)}
          >
            <img src={images[imgIdx]?.image_url} alt={product.name} style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
            <button className={`pdp__wish ${wished ? 'is-on' : ''}`} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => onWish(product)}><Icon name="heart" size={22} filled={wished} /></button>
            {images.length > 1 && <>
              <button className="pdp__nav pdp__nav--prev" aria-label="Previous image" onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)}>‹</button>
              <button className="pdp__nav pdp__nav--next" aria-label="Next image" onClick={() => setImgIdx((imgIdx + 1) % images.length)}>›</button>
              <span className="pdp__count">{imgIdx + 1} / {images.length}</span>
            </>}
          </div>
        </section>

        <section className="pdp__info">
          <span className="section-kicker">{productCategoryName(product) || 'DripNow edit'}</span>
          <h1 id="pdp-title">{product.name}</h1>
          {store && <p className="pdp__seller">Sold by <button className="link-btn" onClick={() => onStore(store.id)}>{store.business_name}</button> · {store.city}</p>}

          <div className="pdp__price">
            <strong>{inr(price)}</strong>
            <span className="pdp__tax">Inclusive of applicable taxes. Delivery fee shown at checkout.</span>
          </div>

          {sizes.length > 0 && (
            <fieldset className="pdp__opt">
              <legend>Size <b>{size}</b></legend>
              <div className="pdp__chips">
                {sizes.map((s) => <button key={s} type="button" className={`${s === size ? 'is-active' : ''} ${optionInStock('size', s) ? '' : 'is-out'}`} onClick={() => { setSize(s); setQty(1); }} aria-pressed={s === size}>{s}</button>)}
              </div>
            </fieldset>
          )}
          {colors.length > 0 && (
            <fieldset className="pdp__opt">
              <legend>Colour <b>{color}</b></legend>
              <div className="pdp__chips">
                {colors.map((c) => <button key={c} type="button" className={`${c === color ? 'is-active' : ''} ${optionInStock('color', c) ? '' : 'is-out'}`} onClick={() => { setColor(c); setQty(1); }} aria-pressed={c === color}>{c}</button>)}
              </div>
            </fieldset>
          )}

          <p className={`pdp__stock ${stock > 5 ? 'is-ok' : stock > 0 ? 'is-low' : 'is-out'}`} role="status">
            {variants.length === 0 ? 'Currently unavailable' : needsOptions ? 'This combination is not available' : stock > 5 ? '● In stock' : stock > 0 ? `● Hurry, only ${stock} left` : '● Out of stock'}
          </p>

          <div className="pdp__buy">
            <div className="pdp__qty" aria-label="Quantity">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
              <output>{qty}</output>
              <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty || !canBuy} aria-label="Increase quantity">+</button>
            </div>
            <button className="sl-btn sl-btn--dark pdp__add" disabled={!canBuy || busy} onClick={() => onAdd(product, selected?.id, qty)}>Add to bag</button>
            <button className="sl-btn sl-btn--gold pdp__now" disabled={!canBuy || busy} onClick={() => onAdd(product, selected?.id, qty, true)}>Buy now</button>
          </div>

          <ul className="pdp__perks">
            <li><span><Icon name="bolt" size={18} /></span><p><b>60-minute delivery</b><small>In supported zones, from a nearby seller</small></p></li>
            <li><span>⇄</span><p><b>Try &amp; Buy</b><small>Try at your door, pay for what you keep</small></p></li>
            <li><span>↺</span><p><b>7-day returns</b><small>Easy returns and size exchange</small></p></li>
          </ul>

          <div className="pdp__actions">
            <button onClick={() => onWish(product)}><Icon name="heart" size={15} filled={wished} /> {wished ? 'Saved' : 'Save for later'}</button>
            <button onClick={share}>↗ Share</button>
            {store && <button onClick={onStoresMap}>⌖ Find the store</button>}
          </div>
        </section>
      </div>

      <section className="pdp__tabs" aria-label="Product details">
        <div role="tablist" className="pdp__tablist">
          {([['description', 'Description'], ['details', 'Details'], ['delivery', 'Delivery & returns']] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-active' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <div role="tabpanel" className="pdp__panel">
          {tab === 'description' && (product.description?.trim()
            ? product.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
            : <p className="pdp__muted">The seller hasn't added a detailed description yet.</p>)}
          {tab === 'details' && (
            <dl className="pdp__specs">
              <div><dt>Category</dt><dd>{productCategoryName(product) || '—'}</dd></div>
              {selected?.sku && <div><dt>SKU</dt><dd>{selected.sku}</dd></div>}
              {sizes.length > 0 && <div><dt>Sizes</dt><dd>{sizes.join(', ')}</dd></div>}
              {colors.length > 0 && <div><dt>Colours</dt><dd>{colors.join(', ')}</dd></div>}
              {store && <div><dt>Sold by</dt><dd>{store.business_name}, {store.address_line1}, {store.city} {store.postal_code}</dd></div>}
            </dl>
          )}
          {tab === 'delivery' && (
            <ul className="pdp__policy">
              <li><b>Delivery.</b> Orders from nearby sellers are delivered in as little as 60 minutes in supported zones. The exact fee is shown before you pay.</li>
              <li><b>Try &amp; Buy.</b> Try your items at the door and keep only what you love.</li>
              <li><b>Returns &amp; exchanges.</b> Return within the return window or exchange for another size or colour from the Orders page.</li>
              <li><b>Payments.</b> Cash on delivery and verified online payments.</li>
            </ul>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="pdp__more" aria-label="You may also like">
          <div className="pdp__more-head"><h2>You may also like</h2></div>
          <div className="pdp__row">
            {related.map((p) => <ProductCard key={p.id} product={p} storeName={storeName(p.seller_id)} wished={wishlistIds.has(p.id)} busy={busy} onOpen={onOpen} onWish={onWish} onAdd={(x) => ((x.variants?.length ?? 0) > 1 ? onOpen(x) : onAdd(x, x.variants?.[0]?.id, 1))} />)}
          </div>
        </section>
      )}
      {recentProducts.length > 0 && (
        <section className="pdp__more" aria-label="Recently viewed">
          <div className="pdp__more-head"><h2>Recently viewed</h2></div>
          <div className="pdp__row">
            {recentProducts.map((p) => <ProductCard key={p.id} product={p} storeName={storeName(p.seller_id)} wished={wishlistIds.has(p.id)} busy={busy} onOpen={onOpen} onWish={onWish} onAdd={(x) => ((x.variants?.length ?? 0) > 1 ? onOpen(x) : onAdd(x, x.variants?.[0]?.id, 1))} />)}
          </div>
        </section>
      )}

      <div className="pdp__sticky" aria-hidden={!canBuy}>
        <div><b>{inr(price)}</b><span>{product.name}</span></div>
        <button className="sl-btn sl-btn--dark" disabled={!canBuy || busy} onClick={() => onAdd(product, selected?.id, qty)}>Add to bag</button>
      </div>
    </article>
  );
};
