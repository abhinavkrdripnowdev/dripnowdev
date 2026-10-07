import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import api from '@/lib/api';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import './DashboardLayout.css';

interface NavItem {
  label: string;
  icon: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
  roleColor?: string;
  navItems?: NavItem[];
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const ICON: Record<string, React.ReactNode> = {
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.2" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" /></>,
  box: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12.5h2M3 10h18" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.5 2.2 3.5 5.2" /></>,
  store: <><path d="M4 9 5.5 4h13L20 9" /><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9v11H4z" /><path d="M10 20v-5h4v5" /></>,
  route: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M6 15.8V9a3 3 0 0 1 3-3h6.8" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="m7 15 4-4 3 3 5-6" /></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  check: <><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  bell: <><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  alert: <><path d="M12 3 2.5 20h19z" /><path d="M12 10v4M12 17.2v.1" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  party: <><path d="m4 20 4.5-12L16 15.5z" /><path d="M14 4v2M19 8h2M17.5 4.5l1-1M10 3l.5 1.5" /></>,
  logout: <><path d="M10 4H5v16h5" /><path d="M15 8l4 4-4 4M19 12H9" /></>,
};

/** Pick a consistent line icon from the nav label, so dashboards don't need to ship emoji. */
const iconFor = (label: string): React.ReactNode => {
  const l = label.toLowerCase();
  const name =
    /overview/.test(l) ? 'grid'
    : /seller approvals/.test(l) ? 'store'
    : /delivery partners/.test(l) ? 'route'
    : /open orders/.test(l) ? 'box'
    : /active delivery/.test(l) ? 'route'
    : /history/.test(l) ? 'clock'
    : /order/.test(l) ? 'box'
    : /product/.test(l) ? 'bag'
    : /offer|coupon/.test(l) ? 'tag'
    : /earning|finance|payout/.test(l) ? 'wallet'
    : /location/.test(l) ? 'pin'
    : /profile|account/.test(l) ? 'user'
    : /user/.test(l) ? 'users'
    : /report/.test(l) ? 'chart'
    : /audit|log/.test(l) ? 'list'
    : /pricing|setting/.test(l) ? 'sliders'
    : /approv|verif/.test(l) ? 'check'
    : 'grid';
  return <Glyph name={name} />;
};

export const Glyph: React.FC<{ name: string; size?: number }> = ({ name, size = 19 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[name]}</svg>
);

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  role,
  navItems = [],
}) => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = () => api.get('/notifications').then(r => setNotifications(r.data.data ?? [])).catch(() => undefined);
    void load(); const timer = window.setInterval(load, 30000); return () => window.clearInterval(timer);
  }, [user]);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } finally { clearAuth(); navigate('/login'); }
  };

  return (
    <div className="dash-layout">
      {mobileNavOpen && <button className="dash-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      {/* Sidebar */}
      <aside className={`dash-sidebar ${mobileNavOpen ? 'dash-sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="dash-sidebar__logo">
          <div className="dash-brandmark" aria-hidden="true"><b>60</b><small>MIN</small></div>
          <div>
            <div className="dash-sidebar__logo-brand">dripnow<i>.</i></div>
            <div className="dash-sidebar__logo-role">{role}</div>
          </div>
        </div>

        {/* User info */}
        <div className="dash-sidebar__user">
          <div className="dash-sidebar__user-avatar">
            {(user?.full_name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
          </div>
          <div className="dash-sidebar__user-info">
            <div className="dash-sidebar__user-name">{user?.full_name ?? 'User'}</div>
            <div className="dash-sidebar__user-email">{user?.email ?? ''}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="dash-sidebar__nav">
          {navItems.map((item, i) => (
            <button
              key={i}
              className={`dash-sidebar__nav-item ${item.active ? 'dash-sidebar__nav-item--active' : ''}`}
              onClick={() => {
                item.onClick?.();
                setMobileNavOpen(false);
              }}
            >
              <span className="dash-sidebar__nav-icon">{iconFor(item.label)}</span>
              <span className="dash-sidebar__nav-label">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="dash-sidebar__nav-badge">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <button className="dash-sidebar__logout" onClick={handleLogout} id="logout-btn">
          <Glyph name="logout" size={18} />
          <span>Log out</span>
        </button>
      </aside>

      {/* Main content */}
      <main className="dash-main">
        {/* Top header */}
        <header className="dash-header">
          <div className="dash-header__left">
            <button className="dash-mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Glyph name="menu" size={22} /></button>
            <div className="dash-header__greeting">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},&nbsp;
              <strong>{user?.full_name?.split(' ')[0] ?? 'there'}</strong>
            </div>
          </div>
          <div className="dash-header__right">
            <ThemeToggle />
            <div style={{ position: 'relative' }}>
              <button className="dash-notification-btn" aria-label="Notifications" onClick={() => setShowNotifications(v => !v)}><Glyph name="bell" size={18} />{notifications.filter(n => !n.is_read).length > 0 && <span>{notifications.filter(n => !n.is_read).length}</span>}</button>
              {showNotifications && <div className="dash-notification-popover" role="dialog" aria-label="Notifications">
                <strong>Notifications</strong>
                {!notifications.length && <p>No notifications.</p>}
                {notifications.map(n => <button key={n.id} className={n.is_read ? 'is-read' : ''} onClick={() => { if (!n.is_read) void api.patch(`/notifications/${n.id}/read`).then(() => setNotifications(rows => rows.map(x => x.id === n.id ? { ...x, is_read: true } : x))); }}><b>{n.title}</b><small>{n.message}</small></button>)}
              </div>}
            </div>
            <div className="dash-header__badge">
              {role}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="dash-content">
          {children}
        </div>
      </main>
    </div>
  );
};
