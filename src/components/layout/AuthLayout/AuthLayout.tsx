import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import './AuthLayout.css';

export type AuthVariant = 'customer' | 'seller' | 'delivery' | 'admin' | 'super-admin';

interface AuthLayoutProps {
  children: React.ReactNode;
  variant?: AuthVariant;
}

const ICONS = {
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6z" />,
  swap: <path d="M4 8h14l-3-3M20 16H6l3 3" />,
  refund: <><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v4h4" /><path d="M12 8v5l3 2" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  box: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12.5h2M3 10h18" /></>,
  route: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M6 15.8V9a3 3 0 0 1 3-3h6.8" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  shield: <><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.5 2.2 3.5 5.2" /></>,
} as const;

interface PanelCopy { kicker: string; headline: [string, string]; text: string; points: { icon: keyof typeof ICONS; title: string; text: string }[] }

const COPY: Record<AuthVariant, PanelCopy> = {
  customer: {
    kicker: 'FOR SHOPPERS',
    headline: ['Your fit,', 'delivered in 60 mins.'],
    text: 'Shop standout pieces from approved sellers in your city, and have them at your door while the look is still on your mind.',
    points: [
      { icon: 'bolt', title: '60-minute delivery', text: 'From a nearby seller, in supported zones' },
      { icon: 'swap', title: 'Try & Buy', text: 'Try at the door and pay for what you keep' },
      { icon: 'refund', title: 'Easy returns', text: 'Return or exchange from your orders page' },
    ],
  },
  seller: {
    kicker: 'FOR SELLERS',
    headline: ['Sell to your city,', 'fast.'],
    text: 'List your catalogue, manage stock and fulfil orders for shoppers nearby, with delivery handled for you.',
    points: [
      { icon: 'pin', title: 'Local reach', text: 'Customers find your store on the map' },
      { icon: 'box', title: 'Catalogue and stock', text: 'Variants, inventory and offers in one place' },
      { icon: 'wallet', title: 'Clear earnings', text: 'Every order and payout tracked' },
    ],
  },
  delivery: {
    kicker: 'FOR DELIVERY PARTNERS',
    headline: ['Deliver on', 'your schedule.'],
    text: 'Pick up from nearby stores and drop to customers in your zone. Go online when you are ready to ride.',
    points: [
      { icon: 'route', title: 'Short, clear routes', text: 'Pickup and drop-off guided step by step' },
      { icon: 'wallet', title: 'Transparent earnings', text: 'See what every trip pays before you accept' },
      { icon: 'clock', title: 'Flexible hours', text: 'Switch availability on and off any time' },
    ],
  },
  admin: {
    kicker: 'OPERATIONS',
    headline: ['Run the', 'marketplace.'],
    text: 'Review sellers and riders, moderate the catalogue, and keep orders, returns and cash collection on track.',
    points: [
      { icon: 'users', title: 'Approvals', text: 'Onboard sellers and delivery partners' },
      { icon: 'list', title: 'Moderation', text: 'Keep the catalogue clean and accurate' },
      { icon: 'shield', title: 'Audit trail', text: 'Every sensitive action is logged' },
    ],
  },
  'super-admin': {
    kicker: 'PLATFORM CONTROL',
    headline: ['Full control,', 'fully audited.'],
    text: 'Manage pricing, access and security policy for the whole platform. Use this portal with care.',
    points: [
      { icon: 'shield', title: 'Access control', text: 'Roles, permissions and sessions' },
      { icon: 'wallet', title: 'Pricing & fees', text: 'Delivery and platform charges' },
      { icon: 'list', title: 'Audit logs', text: 'Complete history of changes' },
    ],
  },
};

const Icon: React.FC<{ name: keyof typeof ICONS }> = ({ name }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
);

const Logo: React.FC<{ inverted?: boolean }> = ({ inverted }) => (
  <Link to="/" className={`auth-logo ${inverted ? 'auth-logo--inverted' : ''}`} aria-label="DripNow home">
    <span className="auth-logo__badge"><b>60</b><small>MIN</small></span>
    <span className="auth-logo__text">dripnow<i>.</i></span>
  </Link>
);

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, variant = 'customer' }) => {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const copy = COPY[variant];

  return (
    <div className="auth-layout">
      <ThemeToggle className="theme-toggle--floating" />
      {isAuthenticated && (
        <div className="auth-session">
          <span>Signed in as <strong>{user?.full_name || user?.email}</strong></span>
          <button onClick={clearAuth}>Log out</button>
        </div>
      )}

      <aside className="auth-panel">
        <div className="auth-panel__frame">
          <div className="auth-panel__content">
            <Logo inverted />
            <div className="auth-panel__body">
              <span className="auth-panel__kicker">{copy.kicker}</span>
              <h1 className="auth-panel__headline">{copy.headline[0]}<br /><em>{copy.headline[1]}</em></h1>
              <p className="auth-panel__sub">{copy.text}</p>
              <ul className="auth-panel__points">
                {copy.points.map((pt) => (
                  <li key={pt.title}>
                    <span><Icon name={pt.icon} /></span>
                    <p><b>{pt.title}</b><small>{pt.text}</small></p>
                  </li>
                ))}
              </ul>
            </div>
            <Link to="/" className="auth-panel__back">← Back to the shop</Link>
          </div>
        </div>
      </aside>

      <main className="auth-main" id="main-content">
        <div className="auth-mobile-top">
          <Logo />
          <Link to="/" className="auth-mobile-top__back">Back to shop</Link>
        </div>
        <div className="auth-card animate-fade-in-up">
          {children}
        </div>
        <p className="auth-footnote">By continuing you agree to DripNow's terms and privacy policy.</p>
      </main>
    </div>
  );
};
