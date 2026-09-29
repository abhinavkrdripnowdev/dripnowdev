import { OrderTracking } from './OrderTracking';
import { payOrder } from '../api/payment.api';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { CustomerAddressManager } from './CustomerAddressManager';
import { cartApi, type CartResponse } from '../api/cart.api';
import { orderApi, type Order } from '../api/order.api';
import api from '@/lib/api';
import './CustomerDashboard.css';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: { name: string } | string;
  images?: { image_url: string }[];
  variants?: { id: string; size?: string; color?: string; price_override?: number; inventory?: { quantity: number } }[];
  base_price: number;
  image?: string;
  seller_id: string;
}

export const CustomerDashboard: React.FC = () => {
  const { user, clearAuth, updateUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'shop' | 'orders' | 'wishlist' | 'addresses' | 'profile'>('shop');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const guestMerge = React.useRef(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
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
    if (!user) { const pending = JSON.parse(sessionStorage.getItem('guestCart') || '[]'); pending.push({ product_id: product.id, variant_id: variantId || product.variants?.[0]?.id, quantity: 1 }); sessionStorage.setItem('guestCart', JSON.stringify(pending)); setMessage('Added to your guest cart. Sign in at checkout.'); return; }
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

  const cartCount = cart?.grouped_items?.reduce((acc, group) =>
    acc + group.items.reduce((sum, item) => sum + item.quantity, 0), 0) || 0;
  const cartSubtotal = cart?.total_amount || 0;

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || (typeof p.category === 'string' ? p.category : p.category?.name ?? '').toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && (!maxPrice || Number(p.base_price) <= Number(maxPrice)) && (!sizeFilter || p.variants?.some(v => v.size?.toLowerCase().includes(sizeFilter.toLowerCase()))) && (!colorFilter || p.variants?.some(v => v.color?.toLowerCase().includes(colorFilter.toLowerCase())));
  });

  if (sort === 'price_asc') filteredProducts.sort((a,b) => Number(a.base_price) - Number(b.base_price));
  if (sort === 'price_desc') filteredProducts.sort((a,b) => Number(b.base_price) - Number(a.base_price));
  return (
    <div className="customer-app">
      {message && <p role="status" style={{ padding: 16, background: '#fff8db' }}>{message} <button onClick={() => setMessage('')}>Dismiss</button></p>}
      {!user && <p style={{ padding: 12 }}>Browse freely. <a href="/login">Sign in to checkout</a> · <a href="/register">Create account</a></p>}
      {/* ── 1. Amazon/Flipkart Dual Navigation Header ────────────────────── */}
      <header className="amz-header">
        <div className="amz-header__top">
          {/* Brand Logo */}
          <div className="amz-brand" onClick={() => setActiveTab('shop')}>
            <span className="amz-brand__logo">Drip<span className="amz-brand__swoosh">Now</span></span>
          </div>

          {/* Location Pincode */}
          <div className="amz-location">
            <span className="amz-location__icon">📍</span>
            <div className="amz-location__text">
              <span className="amz-location__sub">Deliver to {user?.full_name?.split(' ')[0] || 'Customer'}</span>
              <span className="amz-location__main">{addresses.find(a => a.id === selectedAddressId)?.city || 'Choose an address'}</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="amz-search">
            <select
              className="amz-search__cat"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {Array.from(new Set(products.map(p => typeof p.category === 'string' ? p.category : p.category?.name).filter(Boolean))).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <input
              type="text"
              className="amz-search__input"
              placeholder="Search products on DripNow..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="amz-search__btn" aria-label="Search">🔍</button>
          </div>

          {/* User Nav Actions */}
          <div className="amz-nav-actions">
            <div className="amz-nav-item" onClick={() => setActiveTab('profile')}>
              <span className="amz-nav-item__sub">Hello, {user?.full_name?.split(' ')[0] || 'User'}</span>
              <span className="amz-nav-item__main">Account & Orders ▾</span>
            </div>

            <div className="amz-nav-item" onClick={() => setActiveTab('orders')}>
              <span className="amz-nav-item__sub">Returns</span>
              <span className="amz-nav-item__main">& Orders</span>
            </div>

            <button className="amz-cart-btn" onClick={() => setIsCartOpen(true)} id="open-cart-btn">
              <span className="amz-cart-icon">🛒</span>
              <span className="amz-cart-badge">{cartCount}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, marginLeft: 12 }}>Cart</span>
            </button>

            <button className="amz-logout-btn" onClick={async () => { try { await api.post('/auth/logout'); } finally { clearAuth(); window.location.href = '/'; } }} title="Log Out of DripNow">
              Log Out
            </button>
          </div>
        </div>

        {/* Subnav Ribbon */}
        <nav className="amz-subnav">
          <div className="amz-subnav__item amz-subnav__item--highlight" onClick={() => setActiveTab('shop')}>
            ☰ All Products
          </div>
          <div className="amz-subnav__item" onClick={() => setSelectedCategory('Mobiles')}>Mobiles</div>
          <div className="amz-subnav__item" onClick={() => setSelectedCategory('Electronics')}>Electronics</div>
          <div className="amz-subnav__item" onClick={() => setSelectedCategory('Fashion')}>Fashion</div>
          <div className="amz-subnav__item" onClick={() => setSelectedCategory('Laptops')}>Laptops & PC</div>
          <div className="amz-subnav__item" onClick={() => setSelectedCategory('Home & Furniture')}>Home & Kitchen</div>
          <div className="amz-subnav__item" style={{ color: '#ffe500' }}>⚡ Local delivery</div>
          <div className="amz-subnav__item" onClick={() => setActiveTab('orders')}>My Orders</div>
          <div className="amz-subnav__item" onClick={() => setActiveTab('wishlist')}>Wishlist ({cartCount})</div>
        </nav>
      </header>

      {/* ── 2. Flipkart Top Category Circles Strip ───────────────────────── */}
      <div className="fk-cat-strip">
        <div className="fk-cat-strip__inner">
          <div className="fk-cat-item" onClick={() => setSelectedCategory('All')}>
            <div className="fk-cat-item__icon">🛍️</div>
            <span className="fk-cat-item__label">All Deals</span>
          </div>
          <div className="fk-cat-item" onClick={() => setSelectedCategory('Mobiles')}>
            <div className="fk-cat-item__icon">📱</div>
            <span className="fk-cat-item__label">Mobiles</span>
          </div>
          <div className="fk-cat-item" onClick={() => setSelectedCategory('Electronics')}>
            <div className="fk-cat-item__icon">🎧</div>
            <span className="fk-cat-item__label">Electronics</span>
          </div>
          <div className="fk-cat-item" onClick={() => setSelectedCategory('Fashion')}>
            <div className="fk-cat-item__icon">👟</div>
            <span className="fk-cat-item__label">Fashion</span>
          </div>
          <div className="fk-cat-item" onClick={() => setSelectedCategory('Laptops')}>
            <div className="fk-cat-item__icon">💻</div>
            <span className="fk-cat-item__label">Laptops</span>
          </div>
          <div className="fk-cat-item" onClick={() => setSelectedCategory('Home & Furniture')}>
            <div className="fk-cat-item__icon">🛋️</div>
            <span className="fk-cat-item__label">Furniture</span>
          </div>
          <div className="fk-cat-item">
            <div className="fk-cat-item__icon">⚡</div>
            <span className="fk-cat-item__label">Local delivery</span>
          </div>
          <div className="fk-cat-item">
            <div className="fk-cat-item__icon">✈️</div>
            <span className="fk-cat-item__label">New arrivals</span>
          </div>
        </div>
      </div>

      {/* ── 3. Main Shopping Area ────────────────────────────────────────── */}
      <main className="customer-main-content">
        {activeTab === 'shop' && (
          <>
            {/* Promo Banner Carousel */}
            <div className="fk-hero-banner">
              <div className="fk-hero-banner__content">
                <span className="fk-hero-badge">Discover DripNow</span>
                <h1 className="fk-hero-title">Everyday finds from local sellers</h1>
                <p className="fk-hero-sub">
                  Browse products from approved sellers. Choose your address and review the complete price before you order.
                </p>
                <button className="fk-hero-btn" onClick={() => { setSelectedCategory('All'); document.querySelector('.product-grid')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  Explore products →
                </button>
              </div>
            </div>

            {/* Deal of the Day Product Grid */}
            <div className="deal-section">
              <div className="deal-header">
                <div className="deal-header__left">
                  <h2 className="deal-title">Shop products</h2>

                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2874f0', cursor: 'pointer' }}>
                  Browse all products ({filteredProducts.length}) →
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: 12 }}><label>Maximum price ₹ <input type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} /></label><label>Size <input value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} /></label><label>Color <input value={colorFilter} onChange={e => setColorFilter(e.target.value)} /></label><label>Sort <select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label></div>
              <div className="product-grid">
                {filteredProducts.map((p) => (
                  <div className="product-card" key={p.id}>

                    <div className="product-card__img-wrap">
                      <img src={p.images?.[0]?.image_url || '/favicon.svg'} alt={p.name} className="product-card__img" />
                    </div>
                    <h4 className="product-card__title"><button onClick={() => { setDetail(p); setSelectedVariant(p.variants?.[0]?.id ?? ''); }}>{p.name}</button></h4>
                    <button onClick={async () => { if (!user) { window.location.href = '/login'; return; } try { await api.post('/customer/wishlist', { product_id: p.id }); setWishlist((await api.get('/customer/wishlist')).data.data); setMessage('Saved to wishlist'); } catch { setMessage('Unable to save item'); } }}>♡ Save</button>

                    <div className="product-card__price-row">
                      <span className="current-price">₹{Number(p.base_price).toLocaleString('en-IN')}</span>


                    </div>



                    <button className="add-cart-btn" onClick={() => handleAddToCart(p)} disabled={isLoading}>
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

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
          <div className="deal-section">
            <h2 className="deal-title" style={{ marginBottom: 16 }}>Account Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Full Name</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{user?.full_name}</div>
              </div>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Email Address</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{user?.email}</div>
              </div>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Phone Number</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{user?.phone}</div>
              </div>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>User Handle</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#2874f0' }}>@{user?.username}</div>
              </div>
            </div>

            <form onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); try { const full_name = String(f.get('name')); await api.put('/customer/profile', { full_name }); updateUser({ full_name }); setMessage('Profile updated'); } catch { setMessage('Unable to update profile'); } }}><label>Full name <input name="name" defaultValue={user?.full_name} minLength={2} required /></label><button>Save profile</button> <a href="/forgot-password">Change password</a></form>
            <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
              <button
                className="checkout-btn"
                style={{ width: 'auto', padding: '10px 24px' }}
                onClick={() => setActiveTab('addresses')}
              >
                Manage Saved Addresses
              </button>
            </div>
          </div>
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

      {detail && <div className="cart-drawer-overlay" onClick={() => setDetail(null)}><section className="cart-drawer" onClick={e => e.stopPropagation()} style={{ padding: 24 }}><button onClick={() => setDetail(null)}>Close</button><h2>{detail.name}</h2><p>{detail.description}</p>{detail.images?.map(img => <img key={img.image_url} src={img.image_url} alt={detail.name} style={{ maxWidth: 200 }} />)}<label>Size / color <select value={selectedVariant} onChange={e => setSelectedVariant(e.target.value)}>{detail.variants?.map(v => <option key={v.id} value={v.id}>{v.size || 'Standard'} {v.color} · ₹{Number(v.price_override ?? detail.base_price)} · Stock {v.inventory?.quantity ?? 0}</option>)}</select></label><button onClick={() => void handleAddToCart(detail, selectedVariant)}>Add to cart</button></section></div>}
      {/* ── 5. Amazon Multi-Column Footer ───────────────────────────────── */}
      <footer className="amz-footer">
        <div className="amz-footer__back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top ↑
        </div>

        <div className="amz-footer__content">
          <div>
            <h4 className="amz-footer__col-title">Get to Know Us</h4>
            <ul className="amz-footer__links">
              <li><a href="#about" className="amz-footer__link">About DripNow</a></li>
              <li><a href="#careers" className="amz-footer__link">Careers</a></li>
              <li><a href="#press" className="amz-footer__link">Press Releases</a></li>
              <li><a href="#science" className="amz-footer__link">DripNow Science</a></li>
            </ul>
          </div>

          <div>
            <h4 className="amz-footer__col-title">Connect with Us</h4>
            <ul className="amz-footer__links">
              <li><a href="#facebook" className="amz-footer__link">Facebook</a></li>
              <li><a href="#twitter" className="amz-footer__link">Twitter / X</a></li>
              <li><a href="#instagram" className="amz-footer__link">Instagram</a></li>
            </ul>
          </div>

          <div>
            <h4 className="amz-footer__col-title">Make Money with Us</h4>
            <ul className="amz-footer__links">
              <li><a href="/login/seller" className="amz-footer__link">Sell on DripNow</a></li>
              <li><a href="/login/delivery" className="amz-footer__link">Become a Delivery Partner</a></li>
              <li><a href="#advertise" className="amz-footer__link">Advertise Your Products</a></li>
              <li><a href="#affiliate" className="amz-footer__link">Become an Affiliate</a></li>
            </ul>
          </div>

          <div>
            <h4 className="amz-footer__col-title">Let Us Help You</h4>
            <ul className="amz-footer__links">
              <li><a href="#account" className="amz-footer__link">Your Account</a></li>
              <li><a href="#returns" className="amz-footer__link">Returns Centre</a></li>
              <li><a href="#protection" className="amz-footer__link">100% Purchase Protection</a></li>
              <li><a href="#help" className="amz-footer__link">Help & Support</a></li>
            </ul>
          </div>
        </div>

        <div className="amz-footer__bottom">
          © {new Date().getFullYear()} DripNow Inc. — Inspired by Amazon & Flipkart Shopping Experience. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
