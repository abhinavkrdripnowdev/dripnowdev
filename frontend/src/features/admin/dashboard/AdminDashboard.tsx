import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout/DashboardLayout';
import { adminApi, type PendingSeller } from '../api/admin.api';
import '@/components/layout/DashboardLayout/DashboardLayout.css';

type Section = 'overview' | 'sellers' | 'delivery' | 'users' | 'orders' | 'audit';

export const AdminDashboard: React.FC = () => {
  const [section, setSection] = useState<Section>('overview');
  const [sellers, setSellers] = useState<PendingSeller[]>([]);
  const [allSellers, setAllSellers] = useState<PendingSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadSellers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pending, all] = await Promise.all([
        adminApi.getSellers('pending'),
        adminApi.getSellers(),
      ]);
      setSellers(pending);
      setAllSellers(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSellers(); }, [loadSellers]);

  const handleApprove = async (sellerId: string) => {
    setActionLoading(sellerId + '-approve');
    try {
      await adminApi.approveSeller(sellerId);
      setSellers(prev => prev.filter(s => s.id !== sellerId));
      setAllSellers(prev => prev.map(s => s.id === sellerId ? { ...s, status: 'approved' } : s));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve seller');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (sellerId: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    setActionLoading(sellerId + '-reject');
    try {
      await adminApi.rejectSeller(sellerId, reason);
      setSellers(prev => prev.filter(s => s.id !== sellerId));
      setAllSellers(prev => prev.map(s => s.id === sellerId ? { ...s, status: 'rejected' } : s));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject seller');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (sellerId: string) => {
    const reason = window.prompt('Enter suspension reason:');
    if (!reason) return;
    setActionLoading(sellerId + '-suspend');
    try {
      await adminApi.suspendSeller(sellerId, reason);
      setAllSellers(prev => prev.map(s => s.id === sellerId ? { ...s, status: 'suspended' } : s));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend seller');
    } finally {
      setActionLoading(null);
    }
  };

  const approvedCount = allSellers.filter(s => s.status === 'approved').length;
  const pendingCount = sellers.length;
  const suspendedCount = allSellers.filter(s => s.status === 'suspended').length;

  const navItems = [
    { label: 'Overview',         icon: '📊', active: section === 'overview',  onClick: () => setSection('overview') },
    { label: 'Seller Approvals', icon: '🏪', active: section === 'sellers',   onClick: () => setSection('sellers'),  badge: pendingCount },
    { label: 'Delivery Partners',icon: '🏍️', active: section === 'delivery',  onClick: () => setSection('delivery') },
    { label: 'Users',            icon: '👥', active: section === 'users',     onClick: () => setSection('users') },
    { label: 'Orders',           icon: '📦', active: section === 'orders',    onClick: () => setSection('orders') },
    { label: 'Audit Logs',       icon: '🔍', active: section === 'audit',     onClick: () => setSection('audit') },
  ];

  if (loading) {
    return (
      <DashboardLayout role="Manager" roleColor="hsl(37, 90%, 55%)" navItems={navItems}>
        <div className="dash-loader"><div className="dash-loader__spinner" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="Manager" roleColor="hsl(37, 90%, 55%)" navItems={navItems}>
      {error && (
        <div className="dash-alert dash-alert--error">
          ⚠️ {error}&nbsp;
          <button className="dash-btn dash-btn--ghost" onClick={loadSellers} style={{ marginLeft: 'auto' }}>Retry</button>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {section === 'overview' && (
        <>
          <div className="dash-metrics">
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">⏳</div>
              <div className="dash-metric-card__value">{pendingCount}</div>
              <div className="dash-metric-card__label">Pending Approvals</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">✅</div>
              <div className="dash-metric-card__value">{approvedCount}</div>
              <div className="dash-metric-card__label">Approved Sellers</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">⛔</div>
              <div className="dash-metric-card__value">{suspendedCount}</div>
              <div className="dash-metric-card__label">Suspended Sellers</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">🏪</div>
              <div className="dash-metric-card__value">{allSellers.length}</div>
              <div className="dash-metric-card__label">Total Sellers</div>
            </div>
          </div>

          {/* Pending approvals prompt */}
          {pendingCount > 0 && (
            <div className="dash-alert dash-alert--warning">
              ⚠️ <strong>{pendingCount}</strong> seller application{pendingCount > 1 ? 's' : ''} awaiting review.
              <button className="dash-btn dash-btn--warning" onClick={() => setSection('sellers')} style={{ marginLeft: 'auto' }}>
                Review Now →
              </button>
            </div>
          )}

          <div className="dash-section-header">
            <h2 className="dash-section-title">Pending Seller Applications</h2>
          </div>
          <SellerApplicationsTable
            sellers={sellers.slice(0, 5)}
            onApprove={handleApprove}
            onReject={handleReject}
            onSuspend={handleSuspend}
            actionLoading={actionLoading}
          />
        </>
      )}

      {/* ── SELLERS ── */}
      {section === 'sellers' && (
        <>
          <div className="dash-section-header">
            <h2 className="dash-section-title">Seller Management</h2>
            <span style={{ fontSize: '0.85rem', color: 'hsl(220,10%,55%)' }}>{allSellers.length} seller{allSellers.length !== 1 ? 's' : ''}</span>
          </div>
          <SellerApplicationsTable
            sellers={allSellers}
            onApprove={handleApprove}
            onReject={handleReject}
            onSuspend={handleSuspend}
            actionLoading={actionLoading}
          />
        </>
      )}

      {/* ── PLACEHOLDER SECTIONS ── */}
      {(section === 'delivery' || section === 'users' || section === 'orders' || section === 'audit') && (
        <div className="dash-table-wrap">
          <div className="dash-empty">
            <div className="dash-empty__icon">
              {section === 'delivery' ? '🏍️' : section === 'users' ? '👥' : section === 'orders' ? '📦' : '🔍'}
            </div>
            <div className="dash-empty__text" style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(220,10%,60%)' }}>
              {section === 'delivery' ? 'Delivery Partner Management' : section === 'users' ? 'User Management' : section === 'orders' ? 'Order Monitoring' : 'Audit Logs'}
            </div>
            <div className="dash-empty__text">This section is being built. Check back soon.</div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

/* ── Sub-component: Sellers Table ────────────────────────────────────────────── */
interface SellerApplicationsTableProps {
  sellers: PendingSeller[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSuspend: (id: string) => void;
  actionLoading: string | null;
}

const SellerApplicationsTable: React.FC<SellerApplicationsTableProps> = ({
  sellers, onApprove, onReject, onSuspend, actionLoading
}) => {
  if (sellers.length === 0) {
    return (
      <div className="dash-table-wrap">
        <div className="dash-empty">
          <div className="dash-empty__icon">🎉</div>
          <div className="dash-empty__text">No pending seller applications. All caught up!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Type</th>
            <th>GSTIN</th>
            <th>Status</th>
            <th>Applied</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map(seller => (
            <tr key={seller.id}>
              <td style={{ fontWeight: 600 }}>{seller.business_name}</td>
              <td>{seller.business_type ?? '—'}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{seller.gstin ?? '—'}</td>
              <td>
                <span className={`status-badge status-badge--${seller.status}`}>
                  {seller.status}
                </span>
              </td>
              <td style={{ fontSize: '0.75rem' }}>
                {new Date(seller.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  {seller.status === 'pending' && (
                    <>
                      <button
                        id={`approve-seller-${seller.id}`}
                        className="dash-btn dash-btn--success"
                        disabled={actionLoading !== null}
                        onClick={() => onApprove(seller.id)}
                      >
                        {actionLoading === seller.id + '-approve' ? '⏳' : '✅ Approve'}
                      </button>
                      <button
                        id={`reject-seller-${seller.id}`}
                        className="dash-btn dash-btn--danger"
                        disabled={actionLoading !== null}
                        onClick={() => onReject(seller.id)}
                      >
                        {actionLoading === seller.id + '-reject' ? '⏳' : '✗ Reject'}
                      </button>
                    </>
                  )}
                  {seller.status === 'approved' && (
                    <button
                      id={`suspend-seller-${seller.id}`}
                      className="dash-btn dash-btn--warning"
                      disabled={actionLoading !== null}
                      onClick={() => onSuspend(seller.id)}
                    >
                      {actionLoading === seller.id + '-suspend' ? '⏳' : '⚠️ Suspend'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
