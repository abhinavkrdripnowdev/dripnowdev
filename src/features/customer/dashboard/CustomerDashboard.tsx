import { OrderTracking } from './OrderTracking';
import { Icon as UiIcon } from '@/components/ui/Icon/Icon';
import { payOrder } from '../api/payment.api';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { CustomerAddressManager } from './CustomerAddressManager';
import { cartApi, type CartResponse } from '../api/cart.api';
import { orderApi, type Order } from '../api/order.api';
import api from '@/lib/api';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { CATALOG, FOR_YOU, categoryPath, findNode, matchesCategory } from '../catalog';
import { StoresMap, type Store } from './StoresMap';
import { ProductCard } from './ProductCard';
import { HeroCarousel, type HeroSlide } from './HeroCarousel';
import { ProductPage } from './ProductPage';
import { useTheme } from '../useTheme';
import { askReason, chooseOption, confirmDialog } from '@/lib/dialog';
import { inr, type Product } from '../types';
import './CustomerDashboard.css';
import './Storefront.css';
import './CustomerPages.css';
import { CustomerAccount } from './CustomerAccount';


const ICON_PATHS: Record<string, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
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

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuthStore();

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  type Tab = 'shop' | 'orders' | 'wishlist' | 'addresses' | 'profile' | 'stores' | 'product';
  const TAB_PATHS: Record<Tab, string> = { shop: '/', orders: '/orders', wishlist: '/wishlist', addresses: '/addresses', profile: '/profile', stores: '/stores', product: '/' };
  const productId = params.id ?? '';
  const activeTab: Tab = pathname.startsWith('/product/') ? 'product' : (Object.keys(TAB_PATHS) as Tab[]).find((t) => t !== 'shop' && t !== 'product' && TAB_PATHS[t] === pathname) ?? 'shop';
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
  const { theme, toggle: toggleTheme } = useTheme();
  const [stores, setStores] = useState<Store[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
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
    } finally {
      setProductsLoaded(true);
    }
  };

  useEffect(() => {
    if (user) { fetchCart(); fetchAddresses(); fetchOrders(); api.get('/customer/wishlist').then(r => setWishlist(r.data.data)).catch(() => {}); }
    fetchProducts();
    api.get('/maps/stores').then((r) => setStores(r.data.data ?? [])).catch(() => {});
    if (user && !guestMerge.current) { guestMerge.current = true; const pending = JSON.parse(sessionStorage.getItem('guestCart') || '[]'); if (pending.length) { void (async () => { const remaining = []; for (const item of pending) { try { await cartApi.addToCart(item.product_id, item.quantity, item.variant_id); } catch { remaining.push(item); } } sessionStorage.setItem('guestCart', JSON.stringify(remaining)); await fetchCart(); if (remaining.length) setMessage('Some guest cart items are unavailable.'); })(); } }
  }, []);

  const openProduct = (p: Product) => { navigate(`/product/${p.id}`); };

  const handleAddToCart = async (product: Product, variantId?: string, qty = 1, _buyNow = false) => {
    if (!variantId && (product.variants?.length ?? 0) > 1) { openProduct(product); return; }
    const chosen = variantId || product.variants?.[0]?.id;
    if (!user) {
      const pending = JSON.parse(sessionStorage.getItem('guestCart') || '[]');
      pending.push({ product_id: product.id, variant_id: chosen, quantity: qty });
      sessionStorage.setItem('guestCart', JSON.stringify(pending));
      setGuestCartCount(pending.length);
      setMessage('Added to your guest cart. Sign in at checkout.');
      return;
    }
    try {
      setIsLoading(true);
      const updatedCart = await cartApi.addToCart(product.id, qty, chosen);
      setCart(updatedCart);
      setIsCartOpen(true);
    } catch (err) {
      console.error('Failed to add to cart', err);
      setMessage('Unable to add item. Check availability and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const wishlistIds = new Set<string>(wishlist.map((w) => String(w.product_id ?? w.product?.id)));
  const toggleWish = async (p: Product) => {
    if (!user) { window.location.href = '/login'; return; }
    try {
      if (wishlistIds.has(p.id)) await api.delete(`/customer/wishlist/${p.id}`);
      else await api.post('/customer/wishlist', { product_id: p.id });
      setWishlist((await api.get('/customer/wishlist')).data.data);
      setMessage(wishlistIds.has(p.id) ? 'Removed from wishlist' : 'Saved to wishlist');
    } catch { setMessage('Unable to update wishlist'); }
  };

  const requestReturn = async (order: Order) => {
    const reason = await askReason({ title: 'Request a return', message: 'Tell us what went wrong. Our team reviews every request.', label: 'Reason for return', confirmLabel: 'Request return' });
    if (!reason) return;
    try { await api.post(`/orders/${order.id}/requests`, { kind: 'RETURN', reason }); fetchOrders(); } catch { setMessage('Unable to request return'); }
  };
  const requestExchange = async (order: Order, item: any) => {
    try {
      const product = (await api.get(`/products/${item.product_id}`)).data.data;
      const choices = (product.variants ?? []).filter((v: any) => v.id !== item.variant_id && Number(v.inventory?.quantity ?? 0) > 0);
      if (!choices.length) { setMessage('No replacement variant is currently available'); return; }
      const picked = await chooseOption({
        title: 'Exchange this item',
        message: 'Pick the size or colour you would like instead.',
        options: choices.map((v: any) => ({ value: v.id, label: [v.size, v.color].filter(Boolean).join(' · ') || 'Standard', hint: `${v.inventory?.quantity ?? 0} in stock` })),
        reasonLabel: 'Reason for exchange',
        confirmLabel: 'Request exchange',
      });
      if (!picked) return;
      const replacement = choices.find((v: any) => v.id === picked.value);
      const reason = picked.reason;
      await api.post(`/orders/${order.id}/requests`, { kind: 'EXCHANGE', reason, order_item_id: item.id, requested_variant_id: replacement.id, quantity: 1 });
      await fetchOrders();
    } catch { setMessage('Unable to request exchange'); }
  };
  const cancelOrder = async (order: Order) => {
    if (!(await confirmDialog({ title: 'Cancel this order?', message: 'This cannot be undone. The items go back into stock.', confirmLabel: 'Cancel order', tone: 'danger' }))) return;
    try { await orderApi.cancelOrder(order.id); fetchOrders(); } catch { setMessage('Unable to cancel this order'); }
  };
  const statusTone = (status: string) => /DELIVER|COMPLETE|REFUND|CONFIRMED/.test(status) ? 'ok' : /CANCEL|FAIL|REJECT/.test(status) ? 'bad' : /PENDING|CREATED/.test(status) ? 'wait' : 'info';
  const prettyStatus = (status: string) => status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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
      setMessage('Please select a delivery address');
      return;
    }
    try {
      setIsLoading(true);
      const placed = await orderApi.checkout({ address_id: selectedAddressId, payment_method: paymentMethod, coupon_code: couponCode || undefined }, checkoutKey);
      setCart(null); setIsCartOpen(false); fetchOrders(); setActiveTab('orders');
      if (paymentMethod === 'razorpay') await payOrder(placed.order_id);
      setIsCartOpen(false);
      setCart(null);
      setMessage('Order placed successfully!');
      fetchOrders();
      setActiveTab('orders');
    } catch (err) {
      console.error('Checkout failed', err);
      setMessage('Checkout failed. Please try again.');
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
  const storeName = (id: string) => stores.find((st) => st.id === id)?.business_name;
  const imagesFor = (slug: string) => products.filter((p) => matchesCategory(categorySlug(p), slug)).map((p) => p.images?.[0]?.image_url).filter((u): u is string => !!u).slice(0, 3);
  const newest = [...products].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))).slice(0, 8);
  const scrollToGrid = () => requestAnimationFrame(() => document.querySelector('.product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const heroImages = products.map((p) => p.images?.[0]?.image_url).filter((u): u is string => !!u).slice(0, 3);
  const dealTiles = CATALOG.map((node) => {
    const inNode = products.filter((p) => matchesCategory(categorySlug(p), node.slug));
    if (!inNode.length) return null;
    const max = Math.max(...inNode.map((p) => Number(p.base_price)));
    return { slug: node.slug, name: node.label, image: inNode[0].images?.[0]?.image_url, label: `Under ₹${(Math.ceil(max / 100) * 100 - 1).toLocaleString('en-IN')}` };
  }).filter((t): t is NonNullable<typeof t> => !!t).slice(0, 6);
  const slides: HeroSlide[] = [
    { kicker: `THE NOW EDIT · ${new Date().getFullYear()}`, theme: 'crimson', title: <>Get your fit<br /><em>delivered in 60 mins</em></>, text: 'Curated drops from approved local sellers, at your door while the look is still on your mind.', cta: 'Shop the drop', onCta: () => browseAll(), images: heroImages, pill: ['Under 60 min', 'in supported zones'] },
    { kicker: 'TRY & BUY', theme: 'midnight', title: <>Try it first.<br /><em>Pay for what you keep.</em></>, text: 'Open the box at your door, try every piece, and only pay for what you love.', cta: 'Explore menswear', onCta: () => goCategory('men'), images: imagesFor('men').length ? imagesFor('men') : heroImages, pill: ['Try & Buy', 'at your doorstep'] },
    { kicker: 'LOCAL FIRST', theme: 'forest', title: <>Shop your city.<br /><em>Meet nearby sellers.</em></>, text: 'Every pin on the map is an approved DripNow seller close enough to deliver fast.', cta: 'Open the map', onCta: () => setActiveTab('stores'), images: imagesFor('ethnic').length ? imagesFor('ethnic') : [...heroImages].reverse(), pill: [`${stores.length || 'Local'} stores`, 'near you'] },
  ];
  const browseAll = () => {
    navigate('/');
    requestAnimationFrame(() => document.querySelector('.product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  return (
    <div className="customer-app">
      {message && <div className="customer-toast" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
      <div className="customer-announcement">
        <span><UiIcon name="bolt" size={13} /> Express delivery from nearby sellers</span>
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
            <button className="sl-theme" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
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

            <HeroCarousel slides={slides} onSecondary={() => setActiveTab('orders')} secondaryLabel="Track an order" />

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


            <section className="sl-sec" aria-label="Shop by budget">
              <div className="sl-sec__head"><div><h2>Shop by budget</h2><p>Great fits at every price point</p></div></div>
              <div className="sl-budget">
                {[499, 999, 1499, 2499].map((n) => <button key={n} onClick={() => { setMaxPrice(String(n)); scrollToGrid(); }}><small>Under</small><b>{inr(n)}</b></button>)}
              </div>
            </section>

            {newest.length > 0 && (
              <section className="sl-sec" aria-label="New arrivals">
                <div className="sl-sec__head"><div><h2>New arrivals</h2><p>Just landed from sellers near you</p></div><button className="sl-sec__more" onClick={browseAll}>View all →</button></div>
                <div className="sl-rail">
                  {newest.map((p) => <ProductCard key={p.id} product={p} isNew storeName={storeName(p.seller_id)} wished={wishlistIds.has(p.id)} busy={isLoading} onOpen={openProduct} onWish={toggleWish} onAdd={(x) => handleAddToCart(x)} />)}
                </div>
              </section>
            )}

            <section className="sl-sec" aria-label="Collections">
              <div className="sl-sec__head"><div><h2>Edits we love</h2><p>Hand-picked collections to start your next look</p></div></div>
              <div className="sl-collections">
                {[
                  { slug: 'men', kicker: 'STREETWEAR', title: "The Men's Edit", sub: 'Tees, shirts, and layers' },
                  { slug: 'ethnic', kicker: 'FESTIVE', title: 'Ethnic Edit', sub: 'Sarees, kurtas & more' },
                  { slug: 'footwear', kicker: 'KICKS', title: 'Step it up', sub: 'Sneakers to heels' },
                ].map((c) => {
                  const img = categoryImage(c.slug);
                  return (
                    <button key={c.slug} className={`sl-collection ${img ? '' : 'sl-collection--plain'}`} onClick={() => goCategory(c.slug)}>
                      {img && <img src={img} alt="" loading="lazy" />}
                      <span className="sl-collection__text"><small>{c.kicker}</small><b>{c.title}</b><span>{c.sub} →</span></span>
                    </button>
                  );
                })}
              </div>
            </section>

            {stores.length > 0 && (
              <section className="sl-sec" aria-label="Local sellers">
                <div className="sl-sec__head"><div><h2>Local sellers near you</h2><p>Shop directly from stores in your city</p></div><button className="sl-sec__more" onClick={() => setActiveTab('stores')}>Open map →</button></div>
                <div className="sl-stores">
                  {stores.slice(0, 4).map((st) => (
                    <button key={st.id} className="sl-store" onClick={() => { navigate(`/?seller=${st.id}`); window.scrollTo({ top: 0 }); }}>
                      <span className="sl-store__logo">{st.business_name.charAt(0).toUpperCase()}</span>
                      <span className="sl-store__body"><b>{st.business_name}</b><small>{st.city} · {st.product_count} product{st.product_count === 1 ? '' : 's'}</small></span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="sl-sec" aria-label="How it works">
              <div className="sl-sec__head"><div><h2>How DripNow works</h2><p>From tap to doorstep in three steps</p></div></div>
              <div className="sl-steps">
                <div className="sl-step"><span>⌕</span><h3>Pick your fit</h3><p>Browse styles from approved sellers in your city and see the complete price up front.</p></div>
                <div className="sl-step"><span><UiIcon name="bolt" size={22} /></span><h3>Delivered fast</h3><p>A nearby partner picks up your order and brings it in as little as 60 minutes.</p></div>
                <div className="sl-step"><span>⇄</span><h3>Try &amp; keep</h3><p>Try at the door, keep what you love, and return or exchange the rest easily.</p></div>
              </div>
            </section>
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
              {productsLoaded && <div className="product-resultbar"><span>{filteredProducts.length} style{filteredProducts.length === 1 ? '' : 's'}</span></div>}
              <div className="product-grid">
                {!productsLoaded && Array.from({ length: 8 }, (_, k) => <div className="product-skel" key={k} aria-hidden="true"><i /><i /><i /><i /></div>)}
                {productsLoaded && filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} storeName={storeName(p.seller_id)} wished={wishlistIds.has(p.id)} busy={isLoading} onOpen={openProduct} onWish={toggleWish} onAdd={(x) => handleAddToCart(x)} />
                ))}
                {productsLoaded && filteredProducts.length === 0 && <div className="product-empty"><span>⌕</span><h3>No styles found</h3><p>Try a broader search or clear your filters.</p><button onClick={() => { setSearchQuery(''); navigate('/'); setMaxPrice(''); setSizeFilter(''); setColorFilter(''); }}>Reset shopping filters</button></div>}
              </div>
            </section>

            <section className="editorial-banner"><span>THE DRIPNOW PROMISE</span><h2>Local choice.<br/>Main-character speed.</h2><p>Discover standout products from sellers in your city and see the complete price before you place the order.</p><button onClick={browseAll}>Find your next favourite ↗</button></section>
            {!catSlug && !sellerFilter && (
              <>
                <section className="sl-sec" aria-label="DripNow in numbers">
                  <div className="sl-stats">
                    <div><b>{products.length}</b><span>Products live</span></div>
                    <div><b>{stores.length}</b><span>Local sellers</span></div>
                    <div><b>{CATALOG.reduce((n, c) => n + c.subs.length, 0)}</b><span>Sub-categories</span></div>
                    <div><b>60 min</b><span>Fastest delivery</span></div>
                  </div>
                </section>
                <section className="sl-sec sl-sec--last" aria-label="Partner with us">
                  <div className="sl-app">
                    <div><h2>Grow with DripNow</h2><p>Sell to customers in your city, or deliver orders on your own schedule.</p>
                      <div className="sl-app__badges"><a className="sl-btn sl-btn--gold" href="/login/seller">Sell on DripNow</a><a className="sl-btn sl-btn--ghost" href="/login/delivery">Become a delivery partner</a></div>
                    </div>
                    <div className="sl-app__phone" aria-hidden="true">₹</div>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {activeTab === 'product' && (
          <ProductPage
            productId={productId}
            products={products}
            stores={stores}
            wishlistIds={wishlistIds}
            busy={isLoading}
            onWish={toggleWish}
            onAdd={handleAddToCart}
            onOpen={openProduct}
            onBack={() => navigate('/')}
            onCategory={goCategory}
            onStore={(id) => { navigate(`/?seller=${id}`); window.scrollTo({ top: 0 }); }}
            onStoresMap={() => setActiveTab('stores')}
          />
        )}

        {activeTab === 'stores' && <StoresMap onShopStore={(store) => { navigate(`/?seller=${store.id}`); window.scrollTo({ top: 0 }); }} />}

        {/* Sub-view: My Orders */}
        {activeTab === 'orders' && (
          <div className="deal-section ord-page">
            <div className="deal-header"><div className="deal-header__left"><span className="section-kicker">YOUR PURCHASES</span><h2 className="deal-title">My orders</h2><p>Track deliveries, return or exchange items, and review your history.</p></div></div>
            {!user ? (
              <div className="product-empty"><span>⌑</span><h3>Sign in to see your orders</h3><p>Your order history and live tracking live here.</p><button onClick={() => navigate('/login')}>Sign in</button></div>
            ) : orders.length === 0 ? (
              <div className="product-empty"><span>⌑</span><h3>No orders yet</h3><p>When you place an order, you can track it here.</p><button onClick={browseAll}>Start shopping</button></div>
            ) : (
              <div className="ord-list">
                {orders.map((order) => (
                  <article key={order.id} className="ord">
                    <header className="ord__head">
                      <div><small>ORDER</small><b>#{order.id.substring(0, 8).toUpperCase()}</b></div>
                      <div><small>PLACED</small><b>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b></div>
                      <div><small>TOTAL</small><b>{inr(order.final_amount)}</b></div>
                      <span className={`ord__pill ord__pill--${statusTone(order.status)}`}>{prettyStatus(order.status)}</span>
                    </header>
                    {order.seller_orders?.map((sOrder) => (
                      <section key={sOrder.id} className="ord__seller">
                        <div className="ord__seller-head"><span>Sold by <b>{sOrder.seller_name}</b></span><em>{prettyStatus(sOrder.status)}</em></div>
                        {sOrder.items?.map((item) => (
                          <div key={item.id} className="ord__item">
                            <div className="ord__item-main"><b>{item.product_name}</b><small>Qty {item.quantity}</small></div>
                            <strong>{inr(item.total_price)}</strong>
                            {order.status === '3_HOUR_RETURN_WINDOW' && <button className="ord-btn ord-btn--ghost" onClick={() => requestExchange(order, item)}>Exchange</button>}
                          </div>
                        ))}
                      </section>
                    ))}
                    <footer className="ord__actions">
                      <button className="ord-btn" onClick={() => setTrackingOrder(trackingOrder === order.id ? '' : order.id)}>{trackingOrder === order.id ? 'Hide tracking' : 'Track delivery'}</button>
                      {order.payment_method === 'razorpay' && order.status === 'PAYMENT_PENDING' && <button className="ord-btn ord-btn--primary" onClick={() => payOrder(order.id).then(fetchOrders).catch((e) => setMessage(e.message))}>Pay securely</button>}
                      {order.status === '3_HOUR_RETURN_WINDOW' && <button className="ord-btn ord-btn--ghost" onClick={() => requestReturn(order)}>Request return</button>}
                      {['ORDER_CREATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'SELLER_ORDER_CREATED'].includes(order.status) && <button className="ord-btn ord-btn--danger" onClick={() => cancelOrder(order)}>Cancel order</button>}
                    </footer>
                    {trackingOrder === order.id && <div className="ord__track"><OrderTracking orderId={order.id} /></div>}
                  </article>
                ))}
              </div>
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
            <div className="deal-header"><div className="deal-header__left"><span className="section-kicker">YOUR SAVED STYLES</span><h2 className="deal-title">My Wishlist</h2><p>{wishlist.length ? `${wishlist.length} item${wishlist.length === 1 ? '' : 's'} saved for later` : 'Tap the heart on anything you love and it will wait for you here.'}</p></div></div>
            {!user ? (
              <div className="product-empty"><span><UiIcon name="heart" size={42} /></span><h3>Sign in to see your wishlist</h3><p>Your saved styles sync across devices.</p><button onClick={() => navigate('/login')}>Sign in</button></div>
            ) : wishlist.length === 0 ? (
              <div className="product-empty"><span><UiIcon name="heart" size={42} /></span><h3>Your wishlist is empty</h3><p>Explore new arrivals and save your favourites.</p><button onClick={browseAll}>Explore products</button></div>
            ) : (
              <div className="product-grid">
                {products.filter((p) => wishlistIds.has(p.id)).map((p) => (
                  <ProductCard key={p.id} product={p} storeName={storeName(p.seller_id)} wished busy={isLoading} onOpen={openProduct} onWish={toggleWish} onAdd={(x) => handleAddToCart(x)} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── 4. Cart Slide-Over Drawer Modal ─────────────────────────────── */}
      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer__header">
              <span className="cart-drawer__title">Your bag ({cartCount})</span>
              <button className="cart-drawer__close" onClick={() => setIsCartOpen(false)} aria-label="Close bag"><UiIcon name="cross" size={16} /></button>
            </div>

            <div className="cart-drawer__body">
              {!cart || !cart.grouped_items || cart.grouped_items.length === 0 ? (
                <div className="cart-empty">
                  <span aria-hidden="true">⌑</span>
                  <h3>{user ? 'Your bag is empty' : 'Your guest bag'}</h3>
                  <p>{user ? 'Add something you love and it will show up here.' : 'Your selected items are saved for checkout.'}</p>
                  {!user && <a className="cart-empty__link" href="/login">Sign in to continue</a>}
                  <button className="sl-btn sl-btn--dark" onClick={() => { setIsCartOpen(false); browseAll(); }}>Start shopping</button>
                </div>
              ) : (
                cart.grouped_items.map((group) => (
                  <div key={group.seller_id} className="cart-group">
                    <div className="cart-group__title">
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
                            <span className="cart-item__count">{item.quantity}</span>
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
                <div className="cart-field">
                  <label className="cart-field__label">Delivery address</label>
                  {addresses.length > 0 ? (
                    <select
                      className="cart-select"
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
                    <div className="cart-warn">No addresses found. <button type="button" className="link-btn" onClick={() => { setIsCartOpen(false); setActiveTab('addresses'); }}>Add one now</button></div>
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


      <nav className="customer-mobile-nav" aria-label="Mobile navigation">
        <button className={activeTab === 'shop' ? 'is-active' : ''} onClick={() => setActiveTab('shop')}><span>⌂</span>Home</button>
        <button onClick={() => { setMegaOpen((v) => !v); window.scrollTo({ top: 0 }); }}><span>▦</span>Categories</button>
        <button className={activeTab === 'stores' ? 'is-active' : ''} onClick={() => setActiveTab('stores')}><span>⌖</span>Stores</button>
        <button className={activeTab === 'wishlist' ? 'is-active' : ''} onClick={() => setActiveTab('wishlist')}><span><UiIcon name="heart" size={21} /></span>Wishlist</button>
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
