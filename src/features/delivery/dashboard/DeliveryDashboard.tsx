import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout/DashboardLayout';
import '@/components/layout/DashboardLayout/DashboardLayout.css';

type Section = 'overview' | 'deliveries' | 'earnings' | 'profile';

export const DeliveryDashboard: React.FC = () => {
  const [section, setSection] = useState<Section>('overview');
  const [isOnline, setIsOnline] = useState(false);

  const navItems = [
    { label: 'Overview',        icon: '📊', active: section === 'overview',   onClick: () => setSection('overview') },
    { label: 'My Deliveries',   icon: '📦', active: section === 'deliveries', onClick: () => setSection('deliveries') },
    { label: 'Earnings',        icon: '💰', active: section === 'earnings',   onClick: () => setSection('earnings') },
    { label: 'Profile',         icon: '👤', active: section === 'profile',    onClick: () => setSection('profile') },
  ];

  return (
    <DashboardLayout role="Delivery Partner" roleColor="hsl(200, 83%, 52%)" navItems={navItems}>
      {section === 'overview' && (
        <>
          {/* Online/Offline toggle */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '20px 24px',
              background: 'hsl(220, 15%, 10%)',
              border: '1px solid hsl(220, 15%, 15%)',
              borderRadius: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'hsl(220,15%,90%)', marginBottom: 4 }}>
                  {isOnline ? '🟢 You are Online' : '🔴 You are Offline'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'hsl(220,10%,55%)' }}>
                  {isOnline
                    ? 'You are visible to the delivery system and will receive orders.'
                    : 'Toggle online to start receiving delivery requests.'}
                </div>
              </div>
              <button
                id="delivery-toggle-online-btn"
                onClick={() => setIsOnline(!isOnline)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  background: isOnline ? 'hsl(0, 72%, 51%, 0.2)' : 'hsl(142, 70%, 45%, 0.2)',
                  color: isOnline ? 'hsl(0, 72%, 65%)' : 'hsl(142, 70%, 60%)',
                  border: `1px solid ${isOnline ? 'hsl(0, 72%, 51%, 0.3)' : 'hsl(142, 70%, 45%, 0.3)'}`,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {isOnline ? 'Go Offline' : 'Go Online'}
              </button>
            </div>
          </div>

          <div className="dash-metrics">
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">🏍️</div>
              <div className="dash-metric-card__value">0</div>
              <div className="dash-metric-card__label">Today's Deliveries</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">💰</div>
              <div className="dash-metric-card__value">₹0</div>
              <div className="dash-metric-card__label">Today's Earnings</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">📦</div>
              <div className="dash-metric-card__value">0</div>
              <div className="dash-metric-card__label">Total Deliveries</div>
            </div>
          </div>

          <div className="dash-table-wrap">
            <div className="dash-empty">
              <div className="dash-empty__icon">🏍️</div>
              <div className="dash-empty__text" style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(220,10%,60%)' }}>
                {isOnline ? 'No available deliveries right now' : 'Go online to start receiving deliveries'}
              </div>
              <div className="dash-empty__text">
                When sellers mark orders ready for pickup, you'll see them here.
              </div>
            </div>
          </div>
        </>
      )}

      {(section === 'deliveries' || section === 'earnings' || section === 'profile') && (
        <div className="dash-table-wrap">
          <div className="dash-empty">
            <div className="dash-empty__icon">
              {section === 'deliveries' ? '📦' : section === 'earnings' ? '💰' : '👤'}
            </div>
            <div className="dash-empty__text" style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(220,10%,60%)' }}>
              {section === 'deliveries' ? 'Delivery History' : section === 'earnings' ? 'Earnings & Payouts' : 'Partner Profile'}
            </div>
            <div className="dash-empty__text">This section is being built. Check back soon.</div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
