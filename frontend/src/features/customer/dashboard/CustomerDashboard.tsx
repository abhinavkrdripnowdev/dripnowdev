import { OrderTracking } from './OrderTracking';
import { payOrder } from '../api/payment.api';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { CustomerAddressManager } from './CustomerAddressManager';
import { cartApi, type CartResponse } from '../api/cart.api';
import { orderApi, type Order } from '../api/order.api';
import api from '@/lib/api';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { CATALOG, FOR_YOU, categoryPath, findNode, matchesCategory } from '../catalog';
import { StoresMap } from './StoresMap';
import './CustomerDashboard.css';
import { CustomerAccount } from './CustomerAccount';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: { id?: number; name: string; slug?: string; parent_id?: number | null } | string;
  images?: { image_url: string }[];
  variants?: { id: string; size?: string; color?: string; price_override?: number; inventory?: { quantity: number } }[];
  base_price: number;
  image?: string;
  seller_id: string;
}


const ICON_PATHS: Record<string, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6z" />,
  swap: <><path d="M4 8h14l-3-3M20 16H6l3 3" /></>,
  refund: <><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v4h4" /><path d="M12 8v5l3 2" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
};

const Icon: React.FC<{ name: keyof typeof ICON_PATHS | string }> = ({ name }) => (
  <svg className="sl-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_PATHS[name]}</svg>
);

const categorySlug = (product: Product) => typeof product.category === 'string' ? product.category.toLowerCase() : (product.category?.slug ?? '').toLowerCase();
const categoryName = (product: Product) => typeof product.category === 'string' ? product.category : product.category?.name ?? '';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuthStore();

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  type Tab = 'shop' | 'orders' | 'wishlist' | 'addresses' | 'profile' | 'stores';
  const TAB_PATHS: Record<Tab, string> = { shop: '/', orders: '/orders', wishlist: '/wishlist', addresses: '/addresses', profile: '/profile', stores: '/stores' };
  const activeTab: Tab = (Object.keys(TAB_PATHS) as Tab[]).find((t) => t !== 'shop' && TAB_PATHS[t] === pathname) ?? 'shop';
  const setActiveTab = (tab: Tab) => { navigate(TAB_PATHS[tab]); window.scrollTo({ top: 0 }); };
  const catSlug = params.slug ?? '';
  const subSlug = params.sub ?? '';
  const sellerFilter = searchParams.get('seller') ?? '';
  const activeNode = findNode(catSlug);
  const goCategory = (slug = '', sub = '') => { navigate(categoryPath(slug, sub)); setMegaOpen(false); window.scrollTo({ top: 0 }); };
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const guestMerge = React.useRef(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  useEffect(() => { if (isCartOpen && user) void fetchAddresses(); }, [isCartOpen]);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [trackingOrder, setTrackingOrder] = useState('');
  const [detail, setDetail] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [guestCartCount, setGuestCartCount] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('guestCart') || '[]').length; } catch { return 0; }
  });
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  useEffect(() => { setQuote(null); setCheckoutKey(crypto.randomUUID()); }, [cart, selectedAddressId, paymentMethod, couponCode]);

  const fetchCart = async () => {
    try {
      const data = await cartApi.getCart();
      setCart(data);
    } catch (err) {
      console.error('Failed to fetch cart', err);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await api.get('/customer/addresses');
      const addrs = res.data.data;
      setAddresses(addrs);
      if (addrs.length > 0) {
        const def = addrs.find((a: any) => a.is_default);
        setSelectedAddressId(def ? def.id : addrs[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch addresses', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await orderApi.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.data.data || res.data.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  useEffect(() => {
    if (user) { fetchCart(); fetchAddresses(); fetchOrders(); api.get('/customer/wishlist').then(r => setWishlist(r.data.data)).catch(() => {}); }
    fetchProducts();
    if (user && !guestMerge.current) { guestMerge.current = true; const pending = JSON.parse(sessionStorage.getItem('guestCart') || '[]'); if (pending.length) { void (async () => { const remaining = []; for (const item of pending) { try { await cartApi.addToCart(item.product_id, item.quantity, item.variant_id); } catch { remaining.push(item); } } sessionStorage.setItem('guestCart', JSON.stringify(remaining)); await fetchCart(); if (remaining.length) setMessage('Some guest cart items are unavailable.'); })(); } }
  }, []);

  const handleAddToCart = async (product: Product, variantId?: string) => {
    if (!variantId && (product.variants?.length ?? 0) > 1) { setDetail(product); setSelectedVariant(product.variants![0].id); return; }
    if (!user) { const pending = JSON.parse(sessionStorage.getItem('guestCart') || '[]'); pending.push({ product_id: product.id, variant_id: variantId || product.variants?.[0]?.id, quantity: 1 }); sessionStorage.setItem('guestCart', JSON.stringify(pending)); setGuestCartCount(pending.length); setMessage('Added to your guest cart. Sign in at checkout.'); return; }
    try {
      setIsLoading(true);
      const updatedCart = await cartApi.addToCart(product.id, 1, variantId || product.variants?.[0]?.id);
      setCart(updatedCart);
      setIsCartOpen(true);
    } catch (err) {
      console.error('Failed to add to cart', err);
      setMessage('Unable to add item. Check availability and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQty = async (itemId: string, delta: number, currentQty: number) => {
    try {
      setIsLoading(true);
      const newQty = currentQty + delta;
      const updatedCart = await cartApi.updateItem(itemId, newQty);
      setCart(updatedCart);
    } catch (err) {
      console.error('Failed to update cart', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!quote) { setMessage('Review your total before placing the order.'); return; }
    if (!selectedAddressId) {
      alert('Please select a delivery address');
      return;
    }
    try {
      setIsLoading(true);
      const placed = await orderApi.checkout({ address_id: selectedAddressId, payment_method: paymentMethod, coupon_code: couponCode || undefined }, checkoutKey);
      setCart(null); setIsCartOpen(false); fetchOrders(); setActiveTab('orders');
      if (paymentMethod === 'razorpay') await payOrder(placed.order_id);
      setIsCartOpen(false);
      setCart(null);
      alert('Order placed successfully!');
      fetchOrders();
      setActiveTab('orders');
    } catch (err) {
      console.error('Checkout failed', err);
      alert('Checkout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const cartCount = user ? (cart?.grouped_items?.reduce((acc, group) =>
    acc + group.items.reduce((sum, item) => sum + item.quantity, 0), 0) || 0) : guestCartCount;
  const cartSubtotal = cart?.total_amount || 0;

  const filteredProducts = products.filter((p) => {
    const matchesCat = matchesCategory(categorySlug(p), catSlug, subSlug) && (!sellerFilter || p.seller_id === sellerFilter);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && (!maxPrice || Number(p.base_price) <= Number(maxPrice)) && (!sizeFilter || p.variants?.some(v => v.size?.toLowerCase().includes(sizeFilter.toLowerCase()))) && (!colorFilter || p.variants?.some(v => v.color?.toLowerCase().includes(colorFilter.toLowerCase())));
  });

  if (sort === 'price_asc') filteredProducts.sort((a,b) => Number(a.base_price) - Number(b.base_price));
  if (sort === 'price_desc') filteredProducts.sort((a,b) => Number(b.base_price) - Number(a.base_price));
  const wishlistCount = wishlist.length;
  const categoryImage = (slug: string) => products.find((p) => matchesCategory(categorySlug(p), slug))?.images?.[0]?.image_url;
  const heroImages = products.map((p) => p.images?.[0]?.image_url).filter((u): u is string => !!u).slice(0, 3);
  const dealTiles = CATALOG.map((node) => {
    const inNode = products.filter((p) => matchesCategory(categorySlug(p), node.slug));
    if (!inNode.length) return null;
    const max = Math.max(...inNode.map((p) => Number(p.base_price)));
    return { slug: node.slug, name: node.label, image: inNode[0].images?.[0]?.image_url, label: `Under ₹${(Math.ceil(max / 100) * 100 - 1).toLocaleString('en-IN')}` };
  }).filter((t): t is NonNullable<typeof t> => !!t).slice(0, 6);
  const browseAll = () => {
    navigate('/');
    requestAnimationFrame(() => document.querySelector('.product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  return (
    <div className="customer-app">
      {message && <div className="customer-toast" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
      <div className="customer-announcement">
        <span>⚡ Express delivery from nearby sellers</span>
        <span className="customer-announcement__desktop">New here? Enjoy a smoother way to shop local.</span>
      </div>
      <header className="sl-header">
        <div className="sl-header__top">
          <button className="sl-brand" onClick={() => navigate('/')} aria-label="DripNow home">
            <span className="sl-brand__badge"><b>60</b><small>min</small></span>
            <span className="sl-brand__text">
              <strong>dripnow<i>.</i></strong>
              <small onClick={(e) => { e.stopPropagation(); if (user) setActiveTab('addresses'); else window.location.href = '/login'; }}>
                Current: <u>{addresses.find((a) => a.is_default)?.city ?? addresses[0]?.city ?? 'Add Address'}</u> ›
              </small>
            </span>
          </button>
          <div className="sl-search">
            <Icon name="search" />
            <input type="text" className="sl-search__input" placeholder="Search for styles, brands & more" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="sl-search__clear" onClick={() => setSearchQuery('')} aria-label="Clear search">×</button>}
          </div>
          <div className="sl-actions">
            <button className="sl-action sl-action--hide-sm" onClick={() => setMegaOpen((v) => !v)} aria-expanded={megaOpen}><Icon name="grid" /><b>Categories</b></button>
            <button className={`sl-action ${activeTab === 'stores' ? 'is-active' : ''}`} onClick={() => setActiveTab('stores')}><Icon name="pin" /><b>Stores</b></button>
            <button className="sl-action sl-action--hide-sm" onClick={browseAll}><Icon name="compass" /><b>Discover</b></button>
            <button className="sl-action" onClick={() => setActiveTab('wishlist')}><Icon name="heart" /><b>Wishlist</b>{wishlistCount > 0 && <em>{wishlistCount}</em>}</button>
            <button className="sl-action" onClick={() => setIsCartOpen(true)} id="open-cart-btn"><Icon name="bag" /><b>Cart</b>{cartCount > 0 && <em>{cartCount}</em>}</button>
            {user
              ? <button className="sl-action" onClick={() => setActiveTab('profile')}><Icon name="user" /><b>{user.full_name?.split(' ')[0] || 'Account'}</b></button>
              : <a className="sl-action" href="/login"><Icon name="user" /><b>Sign in</b></a>}
          </div>
        </div>
        <nav className="sl-cats" aria-label="Shop by category">
          {[FOR_YOU, ...CATALOG].map((category) => {
            const img = categoryImage(category.slug);
            return (
              <button key={category.label} className={`sl-cat ${activeTab === 'shop' && catSlug === category.slug && !sellerFilter ? 'is-active' : ''}`} onClick={() => goCategory(category.slug)}>
                <span className={`sl-cat__art sl-cat__art--${category.tone}`}>{img ? <img src={img} alt="" loading="lazy" /> : category.icon}</span>
                <span className="sl-cat__label">{category.label}</span>
              </button>
            );
          })}
        </nav>
        {megaOpen && (
          <div className="sl-mega" onMouseLeave={() => setMegaOpen(false)}>
            <div className="sl-mega__grid">
              {CATALOG.map((node) => (
                <div key={node.slug} className="sl-mega__col">
                  <button className="sl-mega__title" onClick={() => goCategory(node.slug)}>{node.label}</button>
                  {node.subs.map((sub) => <button key={sub.slug} className="sl-mega__link" onClick={() => goCategory(node.slug, sub.slug)}>{sub.label}</button>)}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>
      <main className="customer-main-content">
        {activeTab === 'shop' && (
          <>
            {activeNode && (
              <section className="cat-hero">
                <nav className="cat-crumbs" aria-label="Breadcrumb">
                  <button onClick={() => navigate('/')}>Home</button><span>/</span>
                  <button onClick={() => goCategory(activeNode.slug)} className={!subSlug ? 'is-current' : ''}>{activeNode.label}</button>
                  {subSlug && <><span>/</span><b>{activeNode.subs.find((x) => x.slug === subSlug)?.label ?? subSlug}</b></>}
                </nav>
                <h1>{subSlug ? activeNode.subs.find((x) => x.slug === subSlug)?.label : activeNode.label}</h1>
                <div className="cat-chips">
                  <button className={!subSlug ? 'is-active' : ''} onClick={() => goCategory(activeNode.slug)}>All {activeNode.label}</button>
                  {activeNode.subs.map((sub) => <button key={sub.slug} className={subSlug === sub.slug ? 'is-active' : ''} onClick={() => goCategory(activeNode.slug, sub.slug)}>{sub.label}</button>)}
                </div>
              </section>
            )}
            {!catSlug && !sellerFilter && (<>
            <section className="sl-promo-bar" aria-label="Offers">
              <span><b>FREE DELIVERY</b> on your first order</span>
              <span className="sl-promo-bar__sep" />
              <span><b>TRY &amp; BUY</b> at your doorstep</span>
            </section>

            <section className="sl-hero">
              <div className="sl-marquee sl-hero__frame">
                <div className="sl-hero__content">
                  <span className="sl-hero__badge">THE NOW EDIT · {new Date().getFullYear()}</span>
                  <h1>Get your fit<br /><em>delivered in 60 mins</em></h1>
                  <p>Curated drops from approved local sellers, at your door while the look is still on your mind.</p>
                  <div className="sl-hero__actions"><button className="sl-btn sl-btn--gold" onClick={browseAll}>Shop the drop <span>→</span></button><button className="sl-btn sl-btn--ghost" onClick={() => setActiveTab('orders')}>Track an order</button></div>
                </div>
                <div className="sl-hero__visual" aria-hidden="true">
                  {heroImages.map((src, i) => <img key={src} src={src} alt="" className={`sl-hero__img sl-hero__img--${i}`} />)}
                  {heroImages.length === 0 && <span className="sl-hero__word">DRIP</span>}
                  <div className="sl-hero__pill"><b>Under 60 min</b><small>in supported zones</small></div>
                </div>
              </div>
            </section>

            <section className="sl-trust" aria-label="Shopping benefits">
              <div><Icon name="bolt" /><span><b>60 Min</b> Delivery</span></div>
              <div><Icon name="swap" /><span><b>Try</b> &amp; Buy</span></div>
              <div><Icon name="refund" /><span><b>Instant</b> Refund</span></div>
            </section>

            {dealTiles.length > 0 && (
              <section className="sl-deals" aria-label="Deals of the day">
                <h2 className="sl-deals__title"><span>Drip</span> of the <span>Day</span></h2>
                <div className="sl-deals__row">
                  {dealTiles.map((tile) => (
                    <button key={tile.slug} className="sl-deal sl-marquee" onClick={() => goCategory(tile.slug)}>
                      <span className="sl-deal__head">{tile.name}</span>
                      <span className="sl-deal__img"><img src={tile.image || '/favicon.svg'} alt={tile.name} loading="lazy" /></span>
                      <span className="sl-deal__foot">{tile.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            </>)}
            <section className="deal-section">
              <div className="deal-header">
                <div className="deal-header__left">
                  <span className="section-kicker">{activeNode ? 'SHOP BY CATEGORY' : sellerFilter ? 'LOCAL STORE' : 'CURATED FOR YOU'}</span>
                  <h2 className="deal-title">{activeNode ? (subSlug ? activeNode.subs.find((x) => x.slug === subSlug)?.label : `All ${activeNode.label}`) : sellerFilter ? 'From this store' : 'Trending right now'}</h2>
                  <p>{sellerFilter ? <>Showing one seller's catalogue. <button className="link-btn" onClick={() => { searchParams.delete('seller'); setSearchParams(searchParams); }}>Show all stores</button></> : 'Fresh finds, ready when you are.'}</p>
                </div>
                <button className="deal-view-all" onClick={() => { navigate('/'); setSearchQuery(''); }}>View all <span>({filteredProducts.length})</span> ↗</button>
              </div>
              <div className="product-filters">
                <label><span>Max price</span><div className="filter-input"><b>₹</b><input type="number" min="0" placeholder="Any" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} /></div></label>
                <label><span>Size</span><input placeholder="e.g. M" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} /></label>
                <label><span>Colour</span><input placeholder="e.g. Black" value={colorFilter} onChange={e => setColorFilter(e.target.value)} /></label>
                <label><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Latest arrivals</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
                {(maxPrice || sizeFilter || colorFilter) && <button className="filter-reset" onClick={() => { setMaxPrice(''); setSizeFilter(''); setColorFilter(''); }}>Clear filters</button>}
              </div>
              <div className="product-grid">
                {filteredProducts.map((p) => (
                  <div className="product-card" key={p.id}>
                    <div className="product-card__img-wrap">
                      <img src={p.images?.[0]?.image_url || '/favicon.svg'} alt={p.name} className="product-card__img" />
                      <span className="product-card__badge">NEW</span>
                      <button className="product-card__wish" aria-label={`Save ${p.name}`} onClick={async () => { if (!user) { window.location.href = '/login'; return; } try { await api.post('/customer/wishlist', { product_id: p.id }); setWishlist((await api.get('/customer/wishlist')).data.data); setMessage('Saved to wishlist'); } catch { setMessage('Unable to save item'); } }}>♡</button>
                      <button className="product-card__quick" onClick={() => { setDetail(p); setSelectedVariant(p.variants?.[0]?.id ?? ''); }}>Quick view</button>
                    </div>
                    <span className="product-card__category">{categoryName(p) || 'DripNow edit'}</span>
                    <h3 className="product-card__title"><button onClick={() => { setDetail(p); setSelectedVariant(p.variants?.[0]?.id ?? ''); }}>{p.name}</button></h3>
                    <div className="product-card__price-row">
                      <span className="current-price">₹{Number(p.base_price).toLocaleString('en-IN')}</span>
                    </div>
                    <button className="add-cart-btn" aria-label="Add to Cart" onClick={() => handleAddToCart(p)} disabled={isLoading}>
                      Add to bag <span>+</span>
                    </button>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div className="product-empty"><span>⌕</span><h3>No styles found</h3><p>Try a broader search or clear your filters.</p><button onClick={() => { setSearchQuery(''); navigate('/'); setMaxPrice(''); setSizeFilter(''); setColorFilter(''); }}>Reset shopping filters</button></div>}
              </div>
            </section>

            <section className="editorial-banner"><span>THE DRIPNOW PROMISE</span><h2>Local choice.<br/>Main-character speed.</h2><p>Discover standout products from sellers in your city and see the complete price before you place the order.</p><button onClick={browseAll}>Find your next favourite ↗</button></section>
          </>
        )}

        {activeTab === 'stores' && <StoresMap onShopStore={(store) => { navigate(`/?seller=${store.id}`); window.scrollTo({ top: 0 }); }} />}

        {/* Sub-view: My Orders */}
        {activeTab === 'orders' && (
          <div className="deal-section">
            <h2 className="deal-title" style={{ marginBottom: 16 }}>My Orders & Track Shipment</h2>

            {orders.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No orders found.</div>
            ) : (
              orders.map(order => (
                <div key={order.id} style={{ padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>ORDER ID: {order.id.substring(0, 8).toUpperCase()}</span>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>Placed on {new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>₹{order.final_amount.toLocaleString('en-IN')}</span>
                      <span className="drip-assured-badge" style={{ background: '#e8f5e9', color: '#2e7d32', marginTop: 4 }}>{order.status}</span>
                    </div>
                  </div>

                  {order.status === '3_HOUR_RETURN_WINDOW' && <button onClick={async () => { const reason = prompt('Reason for return'); if (reason) try { await api.post(`/orders/${order.id}/requests`, { kind: 'RETURN', reason }); fetchOrders(); } catch { setMessage('Unable to request return'); } }}>Request return</button>}
                  <button onClick={() => setTrackingOrder(trackingOrder === order.id ? '' : order.id)}>Track delivery</button>
                  {trackingOrder === order.id && <OrderTracking orderId={order.id} />}
                  {order.payment_method === 'razorpay' && order.status === 'PAYMENT_PENDING' && <button onClick={() => payOrder(order.id).then(fetchOrders).catch(e => setMessage(e.message))}>Pay securely</button>}
                  {order.seller_orders?.map(sOrder => (
                    <div key={sOrder.id} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: '#475569' }}>Sold by: {sOrder.seller_name}</div>
                      {sOrder.items?.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16, borderLeft: '2px solid #e2e8f0', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{item.product_name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Qty: {item.quantity}</div>
                          </div>
                          <div style={{ fontWeight: 600 }}>₹{item.total_price.toLocaleString('en-IN')}</div>
                          {order.status === '3_HOUR_RETURN_WINDOW' && <button onClick={async () => { try { const product = (await api.get(`/products/${item.product_id}`)).data.data; const choices = (product.variants ?? []).filter((v: any) => v.id !== item.variant_id && Number(v.inventory?.quantity ?? 0) > 0); if (!choices.length) { setMessage('No replacement variant is currently available'); return; } const selected = prompt(`Choose replacement:\n${choices.map((v: any, i: number) => `${i + 1}. ${v.size ?? ''} ${v.color ?? ''}`).join('\n')}`); const replacement = choices[Number(selected) - 1]; if (!replacement) return; const reason = prompt('Reason for exchange'); if (!reason) return; await api.post(`/orders/${order.id}/requests`, { kind: 'EXCHANGE', reason, order_item_id: item.id, requested_variant_id: replacement.id, quantity: 1 }); await fetchOrders(); } catch { setMessage('Unable to request exchange'); } }}>Exchange size/color</button>}
                        </div>
                      ))}
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>Status: {sOrder.status.replace(/_/g, ' ').toUpperCase()}</div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                    {(['ORDER_CREATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'SELLER_ORDER_CREATED'].includes(order.status)) && (
                      <button
                        className="checkout-btn"
                        style={{ background: '#ef4444', color: 'white', width: 'auto', padding: '6px 16px', fontSize: '0.85rem' }}
                        onClick={async () => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            await orderApi.cancelOrder(order.id);
                            fetchOrders();
                          }
                        }}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sub-view: Profile */}
        {activeTab === 'profile' && (
          <CustomerAccount orders={orders.length} addresses={addresses.length} wishlist={wishlist.length} onNavigate={setActiveTab} />
        )}

        {/* Sub-view: Addresses */}
        {activeTab === 'addresses' && (
          <div className="deal-section">
            <CustomerAddressManager />
          </div>
        )}

        {/* Sub-view: Wishlist */}
        {activeTab === 'wishlist' && (
          <div className="deal-section">
            <h2 className="deal-title" style={{ marginBottom: 16 }}>My Wishlist</h2>
            <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>❤️</span>
              {wishlist.length === 0 ? 'Your wishlist is empty.' : wishlist.map(item => <div key={item.id}><span>{item.product?.name ?? item.product_name ?? item.name}</span> <button onClick={async () => { await api.delete(`/customer/wishlist/${item.product_id}`); setWishlist(wishlist.filter(w => w.id !== item.id)); }}>Remove</button></div>)}
              <br/><br/>
              <button className="checkout-btn" style={{ width: 'auto', padding: '10px 24px', margin: '0 auto' }} onClick={() => setActiveTab('shop')}>
                Explore Products
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── 4. Cart Slide-Over Drawer Modal ─────────────────────────────── */}
      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer__header">
              <span className="cart-drawer__title">Shopping Cart ({cartCount} items)</span>
              <button className="cart-drawer__close" onClick={() => setIsCartOpen(false)}>✕</button>
            </div>

            <div className="cart-drawer__body">
              {!cart || !cart.grouped_items || cart.grouped_items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  {!user && <p>Your selected items are saved for checkout. <a href="/login">Sign in to continue</a></p>}
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>🛒</span>
                  {user ? 'Your DripNow Cart is empty.' : 'Guest cart'}
                </div>
              ) : (
                cart.grouped_items.map((group) => (
                  <div key={group.seller_id} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                      Shipment from Seller
                    </div>
                    {group.items.map((item) => (
                      <div className="cart-item" key={item.id}>
                        <img src={item.image || '/favicon.svg'} alt={item.product_name} className="cart-item__img" />
                        <div className="cart-item__details">
                          <span className="cart-item__title">{item.product_name}</span>
                          <span className="cart-item__price">₹{item.price.toLocaleString('en-IN')}</span>
                          <div className="cart-item__qty">
                            <button className="qty-btn" onClick={() => updateQty(item.id, -1, item.quantity)} disabled={isLoading}>-</button>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.quantity}</span>
                            <button className="qty-btn" onClick={() => updateQty(item.id, 1, item.quantity)} disabled={isLoading}>+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {cart && cart.grouped_items && cart.grouped_items.length > 0 && (
              <div className="cart-drawer__footer">
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>Delivery Address</label>
                  {addresses.length > 0 ? (
                    <select
                      style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #cbd5e1' }}
                      value={selectedAddressId}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                    >
                      {addresses.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.address_line1}, {a.city} - {a.postal_code}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>No addresses found. Please add one in profile.</div>
                  )}
                </div>

                <label>Payment <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="cod">Cash on delivery</option><option value="razorpay">Pay online with Razorpay</option></select></label>
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="cart-summary-row">
                  <span>Delivery Fee</span>
                  <span>{quote ? `₹${Number(quote.delivery_fee).toFixed(2)}` : 'Review total below'}</span>
                </div>
                <div className="cart-summary-row cart-summary-total">
                  <span>{quote ? 'Total payable' : 'Subtotal before delivery'}</span>
                  <span>₹{Number(quote?.final_amount ?? cartSubtotal).toFixed(2)}</span>
                </div>
                <label>Coupon code <input value={couponCode} onChange={e => setCouponCode(e.target.value)} /></label>
                {quote && <p>Discount: ₹{Number(quote.discount_amount ?? 0).toFixed(2)} · Tax: ₹{Number(quote.tax_amount ?? 0).toFixed(2)} · Platform fee: ₹{Number(quote.platform_fee ?? 0).toFixed(2)}</p>}
                <button className="checkout-btn" disabled={!selectedAddressId || isLoading} onClick={async () => { try { setQuote((await api.post('/orders/quote', { address_id: selectedAddressId, payment_method: paymentMethod, coupon_code: couponCode || undefined })).data.data); } catch (e: any) { setMessage(e.response?.data?.message ?? 'Unable to calculate total'); } }}>Review total</button>
                <button
                  className="checkout-btn"
                  onClick={handleCheckout}
                  disabled={isLoading || !selectedAddressId || !quote}
                >
                  {isLoading ? 'Processing...' : `Place Order (₹${Number(quote?.final_amount ?? 0).toFixed(2)})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {detail && <div className="cart-drawer-overlay" onClick={() => setDetail(null)}><section className="product-detail-drawer" onClick={e => e.stopPropagation()}><button className="product-detail-drawer__close" onClick={() => setDetail(null)}>×</button><div className="product-detail-drawer__gallery">{detail.images?.length ? detail.images.map(img => <img key={img.image_url} src={img.image_url} alt={detail.name} />) : <img src="/favicon.svg" alt={detail.name}/>}</div><span className="section-kicker">{categoryName(detail)}</span><h2>{detail.name}</h2><p>{detail.description}</p><strong>₹{Number(detail.base_price).toLocaleString('en-IN')}</strong><label>Choose size / colour<select value={selectedVariant} onChange={e => setSelectedVariant(e.target.value)}>{detail.variants?.map(v => <option key={v.id} value={v.id}>{v.size || 'Standard'} {v.color} · ₹{Number(v.price_override ?? detail.base_price)} · Stock {v.inventory?.quantity ?? 0}</option>)}</select></label><button className="checkout-btn" onClick={() => void handleAddToCart(detail, selectedVariant)}>Add to bag</button></section></div>}

      <nav className="customer-mobile-nav" aria-label="Mobile navigation">
        <button className={activeTab === 'shop' ? 'is-active' : ''} onClick={() => setActiveTab('shop')}><span>⌂</span>Home</button>
        <button onClick={() => { setMegaOpen((v) => !v); window.scrollTo({ top: 0 }); }}><span>▦</span>Categories</button>
        <button className={activeTab === 'stores' ? 'is-active' : ''} onClick={() => setActiveTab('stores')}><span>⌖</span>Stores</button>
        <button className={activeTab === 'wishlist' ? 'is-active' : ''} onClick={() => setActiveTab('wishlist')}><span>♡</span>Wishlist</button>
        <button onClick={() => setIsCartOpen(true)}><span>⌑</span>Bag{cartCount > 0 && <em>{cartCount}</em>}</button>
      </nav>

      <footer className="sl-footer">
        <div className="sl-footer__trust">
          <div><Icon name="lock" /><span>Secure Payments</span></div>
          <div><Icon name="check" /><span>Genuine Product</span></div>
          <div><Icon name="swap" /><span>Try &amp; Buy</span></div>
          <div><Icon name="refund" /><span>7 Day Return</span></div>
        </div>
        <div className="sl-footer__content">
          <div className="sl-footer__brand">
            <span className="sl-footer__logo">dripnow<i>.</i></span>
            <p>Great local finds, delivered at the speed of now.</p>
            <form className="sl-newsletter" onSubmit={(e) => { e.preventDefault(); setMessage('Thanks for subscribing!'); (e.target as HTMLFormElement).reset(); }}>
              <input type="email" required placeholder="Subscribe to our newsletter" aria-label="Email address" />
              <button type="submit">SUBSCRIBE</button>
            </form>
            <div className="footer-socials"><a href="#instagram">ig</a><a href="#facebook">f</a><a href="#twitter">x</a></div>
          </div>
          <div>
            <h4 className="sl-footer__title">Help</h4>
            <ul className="sl-footer__links">
              <li><a href="#contact">Contact us</a></li>
              <li><a href="#faq">FAQ&apos;s</a></li>
              <li><button onClick={() => setActiveTab('orders')}>Track order</button></li>
              <li><button onClick={() => setActiveTab('stores')}>Find a store</button></li>
              <li><a href="/login/delivery">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="sl-footer__title">Top categories</h4>
            <ul className="sl-footer__links">
              {CATALOG.slice(0, 7).map((node) => <li key={node.slug}><button onClick={() => goCategory(node.slug)}>{node.label}</button></li>)}
            </ul>
          </div>
          <div>
            <h4 className="sl-footer__title">Partner with us</h4>
            <ul className="sl-footer__links">
              <li><a href="/login/seller">Sell on DripNow</a></li>
              <li><a href="/login/delivery">Become a delivery partner</a></li>
              <li><a href="#about">About DripNow</a></li>
            </ul>
          </div>
          <div>
            <h4 className="sl-footer__title">Policies</h4>
            <ul className="sl-footer__links">
              <li><a href="#terms">Terms and Conditions</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#refund">Refund Policy</a></li>
              <li><a href="#returns">Return &amp; Exchange</a></li>
              <li><a href="#shipping">Shipping Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="sl-footer__bottom"><span>© {new Date().getFullYear()} DripNow. All rights reserved.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button></div>
      </footer>
    </div>
  );
};
