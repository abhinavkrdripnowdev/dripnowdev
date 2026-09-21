import React from 'react';
import './AuthLayout.css';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const Logo = () => (
  <div className="auth-logo">
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(262, 83%, 65%)" />
          <stop offset="100%" stopColor="hsl(24, 90%, 60%)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#logoGrad)" />
      <path d="M12 28 L20 12 L28 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M14.5 22.5 L25.5 22.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
    <span className="auth-logo__text">DripNow</span>
  </div>
);

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-layout">
      {/* Left decorative panel — visible on large screens */}
      <aside className="auth-panel" aria-hidden="true">
        <div className="auth-panel__content">
          <Logo />
          <h1 className="auth-panel__headline">
            Shop smarter,<br />
            <span className="text-gradient">deliver faster.</span>
          </h1>
          <p className="auth-panel__sub">
            Join millions of customers, sellers, and delivery partners on DripNow — India's fastest growing marketplace.
          </p>
          <div className="auth-panel__stats">
            <div className="auth-panel__stat">
              <span className="auth-panel__stat-value">2M+</span>
              <span className="auth-panel__stat-label">Happy Customers</span>
            </div>
            <div className="auth-panel__stat">
              <span className="auth-panel__stat-value">50K+</span>
              <span className="auth-panel__stat-label">Active Sellers</span>
            </div>
            <div className="auth-panel__stat">
              <span className="auth-panel__stat-value">10K+</span>
              <span className="auth-panel__stat-label">Delivery Partners</span>
            </div>
          </div>
          <div className="auth-panel__decoration" />
        </div>
      </aside>

      {/* Right auth form panel */}
      <main className="auth-main" id="main-content">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-card animate-fade-in-up">
          {children}
        </div>
      </main>
    </div>
  );
};
