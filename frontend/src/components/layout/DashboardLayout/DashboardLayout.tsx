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

const RoleIcon: Record<string, string> = {
  Customer: '🛍️',
  Seller: '🏪',
  'Delivery Partner': '🏍️',
  Manager: '⚙️',
  'Super Admin': '👑',
};

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
          <div className="dash-sidebar__logo-icon">
            {RoleIcon[role] ?? 'D'}
          </div>
          <div>
            <div className="dash-sidebar__logo-brand">DripNow</div>
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
              <span className="dash-sidebar__nav-icon">{item.icon}</span>
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
          <span>↩</span>
          <span>Log Out</span>
        </button>
      </aside>

      {/* Main content */}
      <main className="dash-main">
        {/* Top header */}
        <header className="dash-header">
          <div className="dash-header__left">
            <button className="dash-mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>☰</button>
            <div className="dash-header__greeting">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},&nbsp;
              <strong>{user?.full_name?.split(' ')[0] ?? 'there'}</strong> 👋
            </div>
          </div>
          <div className="dash-header__right">
            <div style={{ position: 'relative' }}>
              <button className="dash-notification-btn" aria-label="Notifications" onClick={() => setShowNotifications(v => !v)}>🔔 {notifications.filter(n => !n.is_read).length > 0 && <span>{notifications.filter(n => !n.is_read).length}</span>}</button>
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
