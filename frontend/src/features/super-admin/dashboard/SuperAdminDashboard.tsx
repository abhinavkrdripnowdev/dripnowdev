import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout/DashboardLayout';
import '@/components/layout/DashboardLayout/DashboardLayout.css';

type Section = 'overview' | 'payables' | 'settlements' | 'delivery-payouts' | 'cod' | 'config';

export const SuperAdminDashboard: React.FC = () => {
  const [section, setSection] = useState<Section>('overview');

  const navItems = [
    { label: 'Financial Overview',    icon: '💹', active: section === 'overview',        onClick: () => setSection('overview') },
    { label: 'Seller Payables',       icon: '🏪', active: section === 'payables',        onClick: () => setSection('payables') },
    { label: 'Seller Settlements',    icon: '💸', active: section === 'settlements',     onClick: () => setSection('settlements') },
    { label: 'Delivery Payouts',      icon: '🏍️', active: section === 'delivery-payouts',onClick: () => setSection('delivery-payouts') },
    { label: 'COD Reconciliation',    icon: '💵', active: section === 'cod',             onClick: () => setSection('cod') },
    { label: 'Platform Config',       icon: '⚙️', active: section === 'config',          onClick: () => setSection('config') },
  ];

  const getSectionIcon = (s: Section) => {
    if (s === 'payables') return '🏪';
    if (s === 'settlements') return '💸';
    if (s === 'delivery-payouts') return '🏍️';
    if (s === 'cod') return '💵';
    if (s === 'config') return '⚙️';
    return '💹';
  };

  const getSectionTitle = (s: Section) => {
    if (s === 'payables') return 'Seller Payables';
    if (s === 'settlements') return 'Seller Settlements';
    if (s === 'delivery-payouts') return 'Delivery Partner Payouts';
    if (s === 'cod') return 'COD Reconciliation';
    if (s === 'config') return 'Platform Configuration';
    return '';
  };

  return (
    <DashboardLayout role="Super Admin" roleColor="hsl(45, 93%, 55%)" navItems={navItems}>
      {section === 'overview' && (
        <>
          <div className="dash-metrics">
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">💹</div>
              <div className="dash-metric-card__value">₹0</div>
              <div className="dash-metric-card__label">Pending Seller Payables</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">🏍️</div>
              <div className="dash-metric-card__value">₹0</div>
              <div className="dash-metric-card__label">Pending Delivery Payouts</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">💵</div>
              <div className="dash-metric-card__value">0</div>
              <div className="dash-metric-card__label">Pending COD Reconciliation</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">💸</div>
              <div className="dash-metric-card__value">₹0</div>
              <div className="dash-metric-card__label">Total Settled</div>
            </div>
          </div>

          <div className="dash-section-header">
            <h2 className="dash-section-title">Financial Control Panel</h2>
          </div>
          <div className="dash-quick-actions">
            <button className="dash-quick-action" onClick={() => setSection('payables')} id="superadmin-payables-btn">
              <div className="dash-quick-action__icon">🏪</div>
              <div className="dash-quick-action__label">Seller Payables</div>
            </button>
            <button className="dash-quick-action" onClick={() => setSection('settlements')} id="superadmin-settlements-btn">
              <div className="dash-quick-action__icon">💸</div>
              <div className="dash-quick-action__label">Settlements</div>
            </button>
            <button className="dash-quick-action" onClick={() => setSection('delivery-payouts')} id="superadmin-delivery-btn">
              <div className="dash-quick-action__icon">🏍️</div>
              <div className="dash-quick-action__label">Delivery Payouts</div>
            </button>
            <button className="dash-quick-action" onClick={() => setSection('cod')} id="superadmin-cod-btn">
              <div className="dash-quick-action__icon">💵</div>
              <div className="dash-quick-action__label">COD Reconciliation</div>
            </button>
            <button className="dash-quick-action" onClick={() => setSection('config')} id="superadmin-config-btn">
              <div className="dash-quick-action__icon">⚙️</div>
              <div className="dash-quick-action__label">Platform Config</div>
            </button>
          </div>
        </>
      )}

      {section !== 'overview' && (
        <div className="dash-table-wrap">
          <div className="dash-empty">
            <div className="dash-empty__icon">{getSectionIcon(section)}</div>
            <div className="dash-empty__text" style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(220,10%,60%)' }}>
              {getSectionTitle(section)}
            </div>
            <div className="dash-empty__text">
              Financial operations will appear here once the financial system module is complete.
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
