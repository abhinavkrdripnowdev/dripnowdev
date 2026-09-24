import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import './CustomerDashboard.css';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  image: string;
  discount: number;
  assured: boolean;
}

interface CartItem extends Product {
  qty: number;
}

export const CustomerDashboard: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'shop' | 'orders' | 'wishlist' | 'addresses' | 'profile'>('shop');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'p1',
      name: 'Apple iPhone 15 (128 GB) - Blue',
      category: 'Mobiles',
      price: 65999,
      mrp: 79900,
      rating: 4.6,
      reviews: 12840,
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80',
      discount: 17,
      assured: true,
      qty: 1
    }
  ]);

  // Demo Product Inventory
  const products: Product[] = [
    {
      id: 'p1',
      name: 'Apple iPhone 15 (128 GB) - Blue',
      category: 'Mobiles',
      price: 65999,
      mrp: 79900,
      rating: 4.6,
      reviews: 12840,
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80',
      discount: 17,
      assured: true
    },
    {
      id: 'p2',
      name: 'Sony WH-1000XM5 Wireless Headphones',
      category: 'Electronics',
      price: 26990,
      mrp: 34990,
      rating: 4.8,
      reviews: 8430,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
      discount: 22,
      assured: true
    },
    {
      id: 'p3',
      name: 'Nike Air Max 270 Running Shoes',
      category: 'Fashion',
      price: 9495,
      mrp: 14995,
      rating: 4.5,
      reviews: 3120,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
      discount: 36,
      assured: true
    },
    {
      id: 'p4',
      name: 'Samsung 55" 4K Ultra HD Smart QLED TV',
      category: 'Electronics',
      price: 54990,
      mrp: 84900,
      rating: 4.7,
      reviews: 5210,
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80',
      discount: 35,
      assured: true
    },
    {
      id: 'p5',
      name: 'Asus ROG Strix G16 Gaming Laptop',
      category: 'Laptops',
      price: 114990,
      mrp: 149900,
      rating: 4.9,
      reviews: 1980,
      image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&q=80',
      discount: 23,
      assured: true
    },
    {
      id: 'p6',
      name: 'Ergonomic Executive Mesh Office Chair',
      category: 'Home & Furniture',
      price: 6999,
      mrp: 12999,
      rating: 4.4,
      reviews: 4190,
      image: 'https://images.unsplash.com/photo-1580481072645-022f9a6d1270?w=400&q=80',
      discount: 46,
      assured: false
    }
  ];

  // Timer simulation
  const [timer, setTimer] = useState({ h: 4, m: 18, s: 42 });
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: 59, s: 59 };
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 };
        return { h: 4, m: 18, s: 42 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="customer-app">
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
              <span className="amz-location__main">Mumbai 400001</span>
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
              <option value="Mobiles">Mobiles</option>
              <option value="Electronics">Electronics</option>
              <option value="Fashion">Fashion</option>
              <option value="Laptops">Laptops</option>
              <option value="Home & Furniture">Home & Furniture</option>
            </select>
            <input
              type="text"
              className="amz-search__input"
              placeholder="Search DripNow.in or Flipkart assured items..."
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

            <button className="amz-logout-btn" onClick={clearAuth} title="Log Out of DripNow">
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
          <div className="amz-subnav__item" style={{ color: '#ffe500' }}>⚡ DripExpress 10-Min</div>
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
            <span className="fk-cat-item__label">10-Min Express</span>
          </div>
          <div className="fk-cat-item">
            <div className="fk-cat-item__icon">✈️</div>
            <span className="fk-cat-item__label">Flight Deals</span>
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
                <span className="fk-hero-badge">🔥 Big Billion Sale Live</span>
                <h1 className="fk-hero-title">Up to 80% Off on Smartphones & Tech</h1>
                <p className="fk-hero-sub">
                  Get instant ₹5,000 HDFC bank discount + Free 10-Minute Express Delivery across 40+ cities in India.
                </p>
                <button className="fk-hero-btn" onClick={() => setSelectedCategory('Mobiles')}>
                  Explore Deals Now →
                </button>
              </div>
            </div>

            {/* Amazon 4-in-1 Quad Tile Section */}
            <div className="amz-quad-grid">
              <div className="amz-quad-card">
                <h3 className="amz-quad-card__title">Revamp your home in style</h3>
                <div className="amz-quad-card__grid">
                  <div className="amz-quad-item" onClick={() => setSelectedCategory('Home & Furniture')}>
                    <img src="https://images.unsplash.com/photo-1580481072645-022f9a6d1270?w=200&q=80" alt="Chairs" className="amz-quad-item__img" />
                    <span className="amz-quad-item__label">Ergonomic Chairs</span>
                  </div>
                  <div className="amz-quad-item" onClick={() => setSelectedCategory('Electronics')}>
                    <img src="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&q=80" alt="TVs" className="amz-quad-item__img" />
                    <span className="amz-quad-item__label">Smart QLED TVs</span>
                  </div>
                </div>
                <span className="amz-quad-card__link" onClick={() => setSelectedCategory('Home & Furniture')}>Explore all home deals</span>
              </div>

              <div className="amz-quad-card">
                <h3 className="amz-quad-card__title">Latest Mobiles & Accessories</h3>
                <div className="amz-quad-card__grid">
                  <div className="amz-quad-item" onClick={() => setSelectedCategory('Mobiles')}>
                    <img src="https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=200&q=80" alt="iPhone" className="amz-quad-item__img" />
                    <span className="amz-quad-item__label">Flagship Phones</span>
                  </div>
                  <div className="amz-quad-item" onClick={() => setSelectedCategory('Electronics')}>
                    <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80" alt="Audio" className="amz-quad-item__img" />
                    <span className="amz-quad-item__label">ANC Headphones</span>
                  </div>
                </div>
                <span className="amz-quad-card__link" onClick={() => setSelectedCategory('Mobiles')}>See top rated mobiles</span>
              </div>

              <div className="amz-quad-card">
                <h3 className="amz-quad-card__title">Up to 60% Off | Top Fashion Brands</h3>
                <div className="amz-quad-card__grid">
                  <div className="amz-quad-item" onClick={() => setSelectedCategory('Fashion')}>
                    <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80" alt="Footwear" className="amz-quad-item__img" />
                    <span className="amz-quad-item__label">Sport Shoes</span>
                  </div>
                  <div className="amz-quad-item" onClick={() => setSelectedCategory('Laptops')}>
                    <img src="https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=200&q=80" alt="Laptops" className="amz-quad-item__img" />
                    <span className="amz-quad-item__label">Gaming Gear</span>
                  </div>
                </div>
                <span className="amz-quad-card__link" onClick={() => setSelectedCategory('Fashion')}>View trending fashion</span>
              </div>
            </div>

            {/* Deal of the Day Product Grid */}
            <div className="deal-section">
              <div className="deal-header">
                <div className="deal-header__left">
                  <h2 className="deal-title">Deals of the Day</h2>
                  <div className="deal-timer">
                    ⏱️ Ends in {String(timer.h).padStart(2, '0')}h : {String(timer.m).padStart(2, '0')}m : {String(timer.s).padStart(2, '0')}s
                  </div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2874f0', cursor: 'pointer' }}>
                  View All Deals ({filteredProducts.length}) →
                </span>
              </div>

              <div className="product-grid">
                {filteredProducts.map((p) => (
                  <div className="product-card" key={p.id}>
                    <span className="product-card__badge">{p.discount}% OFF</span>
                    <div className="product-card__img-wrap">
                      <img src={p.image} alt={p.name} className="product-card__img" />
                    </div>
                    <h4 className="product-card__title">{p.name}</h4>

                    <div className="product-card__rating">
                      <span className="rating-badge">★ {p.rating}</span>
                      <span className="rating-count">({p.reviews.toLocaleString()})</span>
                    </div>

                    <div className="product-card__price-row">
                      <span className="current-price">₹{p.price.toLocaleString('en-IN')}</span>
                      <span className="mrp-price">₹{p.mrp.toLocaleString('en-IN')}</span>
                      <span className="discount-tag">{p.discount}% off</span>
                    </div>

                    {p.assured && <span className="drip-assured-badge">⚡ DripAssured (10-Min)</span>}

                    <button className="add-cart-btn" onClick={() => addToCart(p)}>
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
            <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>ORDER #DRIP-984210</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Apple iPhone 15 (128 GB) - Blue</div>
                </div>
                <span className="drip-assured-badge" style={{ background: '#e8f5e9', color: '#2e7d32' }}>Status: Out for Delivery</span>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', margin: '16px 0' }}>
                <div style={{ width: '75%', height: '100%', background: '#2874f0' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                <span>Order Placed</span>
                <span>Packed & Dispatched</span>
                <span style={{ color: '#2874f0', fontWeight: 800 }}>Out for Delivery ⚡</span>
                <span>Delivered</span>
              </div>
            </div>
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
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>🛒</span>
                  Your DripNow Cart is empty.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <img src={item.image} alt={item.name} className="cart-item__img" />
                    <div className="cart-item__details">
                      <span className="cart-item__title">{item.name}</span>
                      <span className="cart-item__price">₹{item.price.toLocaleString('en-IN')}</span>
                      <div className="cart-item__qty">
                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>-</button>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-drawer__footer">
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="cart-summary-row">
                  <span>Delivery Fee</span>
                  <span style={{ color: '#388e3c', fontWeight: 700 }}>FREE (DripExpress)</span>
                </div>
                <div className="cart-summary-row cart-summary-total">
                  <span>Total Amount</span>
                  <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <button
                  className="checkout-btn"
                  onClick={() => alert(`Proceeding to checkout with total ₹${cartSubtotal.toLocaleString('en-IN')}`)}
                >
                  Proceed to Buy ({cartCount} items)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
