import React from 'react';
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
  roleColor = '#007185',
  navItems = [],
}) => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
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
              onClick={item.onClick}
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
            <div className="dash-header__greeting">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},&nbsp;
              <strong>{user?.full_name?.split(' ')[0] ?? 'there'}</strong> 👋
            </div>
          </div>
          <div className="dash-header__right">
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
