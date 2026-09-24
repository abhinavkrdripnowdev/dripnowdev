import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout/DashboardLayout';
import { sellerApi, type SellerDashboard as SellerDashboardType, type SellerOrder } from '../api/seller.api';
import '@/components/layout/DashboardLayout/DashboardLayout.css';

type Section = 'overview' | 'orders' | 'products' | 'earnings';

const ORDER_STATUS_FLOW: Record<string, { label: string; next: string | null; btnLabel: string; btnClass: string }> = {
  new:             { label: 'New',              next: 'accepted',         btnLabel: 'Accept Order',      btnClass: 'dash-btn--success' },
  accepted:        { label: 'Accepted',         next: 'preparing',        btnLabel: 'Start Preparing',   btnClass: 'dash-btn--warning' },
  preparing:       { label: 'Preparing',        next: 'ready_for_pickup', btnLabel: 'Mark Ready',        btnClass: 'dash-btn--primary' },
  ready_for_pickup:{ label: 'Ready for Pickup', next: null,               btnLabel: '',                  btnClass: '' },
  completed:       { label: 'Completed',        next: null,               btnLabel: '',                  btnClass: '' },
  cancelled:       { label: 'Cancelled',        next: null,               btnLabel: '',                  btnClass: '' },
};

export const SellerDashboard: React.FC = () => {
  const [section, setSection] = useState<Section>('overview');
  const [dashboard, setDashboard] = useState<SellerDashboardType | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dash, ords] = await Promise.all([
        sellerApi.getDashboard(),
        sellerApi.getOrders(),
      ]);
      setDashboard(dash);
      setOrders(ords);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const updated = await sellerApi.updateOrderStatus(orderId, nextStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status } : o));
      // Refresh dashboard counts
      const dash = await sellerApi.getDashboard();
      setDashboard(dash);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const navItems = [
    { label: 'Overview',  icon: '📊', active: section === 'overview',  onClick: () => setSection('overview') },
    { label: 'Orders',    icon: '📦', active: section === 'orders',    onClick: () => setSection('orders'),    badge: dashboard?.pending_orders_count },
    { label: 'Products',  icon: '👕', active: section === 'products',  onClick: () => setSection('products') },
    { label: 'Earnings',  icon: '💰', active: section === 'earnings',  onClick: () => setSection('earnings') },
    { label: 'Add Product', icon: '➕', onClick: () => navigate('/seller/products/new') },
  ];

  if (loading) {
    return (
      <DashboardLayout role="Seller" roleColor="hsl(262, 83%, 58%)" navItems={navItems}>
        <div className="dash-loader"><div className="dash-loader__spinner" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="Seller" roleColor="hsl(262, 83%, 58%)" navItems={navItems}>
      {error && (
        <div className="dash-alert dash-alert--error">
          ⚠️ {error}&nbsp;
          <button className="dash-btn dash-btn--ghost" onClick={loadDashboard} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Status banner if not approved ── */}
      {dashboard && dashboard.status !== 'approved' && (
        <div className="dash-alert dash-alert--warning">
          ⏳ Your seller account is currently <strong>{dashboard.status}</strong>.
          {dashboard.status === 'pending' && ' Awaiting admin approval before you can sell.'}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {section === 'overview' && (
        <>
          <div className="dash-metrics">
            <div className="dash-metric-card">
              <div className="dash-metric-card__glow" style={{ background: 'hsl(262, 83%, 58%)' }} />
              <div className="dash-metric-card__icon">👕</div>
              <div className="dash-metric-card__value">{dashboard?.total_products ?? 0}</div>
              <div className="dash-metric-card__label">Total Products</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__glow" style={{ background: 'hsl(37, 90%, 55%)' }} />
              <div className="dash-metric-card__icon">📦</div>
              <div className="dash-metric-card__value">{dashboard?.pending_orders_count ?? 0}</div>
              <div className="dash-metric-card__label">Pending Orders</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__glow" style={{ background: 'hsl(142, 70%, 45%)' }} />
              <div className="dash-metric-card__icon">✅</div>
              <div className="dash-metric-card__value">{dashboard?.total_orders_count ?? 0}</div>
              <div className="dash-metric-card__label">Total Orders</div>
            </div>
            <div className="dash-metric-card">
              <div className="dash-metric-card__glow" style={{ background: 'hsl(160, 84%, 39%)' }} />
              <div className="dash-metric-card__icon">💰</div>
              <div className="dash-metric-card__value">₹{(dashboard?.total_earnings ?? 0).toLocaleString('en-IN')}</div>
              <div className="dash-metric-card__label">Total Earnings</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dash-section-header">
            <h2 className="dash-section-title">Quick Actions</h2>
          </div>
          <div className="dash-quick-actions">
            <button className="dash-quick-action" onClick={() => navigate('/seller/products/new')} id="seller-add-product-btn">
              <div className="dash-quick-action__icon">➕</div>
              <div className="dash-quick-action__label">Add Product</div>
            </button>
            <button className="dash-quick-action" onClick={() => setSection('orders')} id="seller-manage-orders-btn">
              <div className="dash-quick-action__icon">📦</div>
              <div className="dash-quick-action__label">Manage Orders</div>
            </button>
            <button className="dash-quick-action" onClick={() => setSection('products')} id="seller-view-products-btn">
              <div className="dash-quick-action__icon">👕</div>
              <div className="dash-quick-action__label">View Products</div>
            </button>
            <button className="dash-quick-action" onClick={() => setSection('earnings')} id="seller-view-earnings-btn">
              <div className="dash-quick-action__icon">💰</div>
              <div className="dash-quick-action__label">View Earnings</div>
            </button>
          </div>

          {/* Low stock warning */}
          {(dashboard?.low_stock_products_count ?? 0) > 0 && (
            <div className="dash-alert dash-alert--warning">
              ⚠️ You have <strong>{dashboard!.low_stock_products_count}</strong> product variant(s) with low stock.
              <button className="dash-btn dash-btn--ghost" onClick={() => setSection('products')} style={{ marginLeft: 'auto' }}>
                View Products
              </button>
            </div>
          )}

          {/* Recent orders preview */}
          <div className="dash-section-header">
            <h2 className="dash-section-title">Recent Orders</h2>
            <button className="dash-btn dash-btn--ghost" onClick={() => setSection('orders')}>See All →</button>
          </div>
          <RecentOrdersTable
            orders={orders.slice(0, 5)}
            onUpdateStatus={handleUpdateOrderStatus}
            updatingOrderId={updatingOrderId}
          />
        </>
      )}

      {/* ── ORDERS ── */}
      {section === 'orders' && (
        <>
          <div className="dash-section-header">
            <h2 className="dash-section-title">All Orders</h2>
            <span style={{ fontSize: '0.85rem', color: 'hsl(220,10%,55%)' }}>
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </span>
          </div>
          <RecentOrdersTable
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
            updatingOrderId={updatingOrderId}
          />
        </>
      )}

      {/* ── PRODUCTS ── */}
      {section === 'products' && (
        <>
          <div className="dash-section-header">
            <h2 className="dash-section-title">My Products</h2>
            <button className="dash-btn dash-btn--primary" onClick={() => navigate('/seller/products/new')}>
              ➕ Add Product
            </button>
          </div>
          <div className="dash-table-wrap">
            <div className="dash-empty">
              <div className="dash-empty__icon">👕</div>
              <div className="dash-empty__text">Product management coming soon. Your products will appear here.</div>
            </div>
          </div>
        </>
      )}

      {/* ── EARNINGS ── */}
      {section === 'earnings' && (
        <>
          <div className="dash-section-header">
            <h2 className="dash-section-title">Earnings Overview</h2>
          </div>
          <div className="dash-metrics">
            <div className="dash-metric-card">
              <div className="dash-metric-card__icon">💰</div>
              <div className="dash-metric-card__value">₹{(dashboard?.total_earnings ?? 0).toLocaleString('en-IN')}</div>
              <div className="dash-metric-card__label">Total Earnings (Completed Orders)</div>
            </div>
          </div>
          <div className="dash-table-wrap">
            <div className="dash-empty">
              <div className="dash-empty__icon">📈</div>
              <div className="dash-empty__text">Detailed earnings breakdown and settlement history coming soon.</div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

/* ── Sub-component: Orders Table ─────────────────────────────────────────────── */
interface RecentOrdersTableProps {
  orders: SellerOrder[];
  onUpdateStatus: (orderId: string, status: string) => void;
  updatingOrderId: string | null;
}

const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({ orders, onUpdateStatus, updatingOrderId }) => {
  if (orders.length === 0) {
    return (
      <div className="dash-table-wrap">
        <div className="dash-empty">
          <div className="dash-empty__icon">📦</div>
          <div className="dash-empty__text">No orders yet. They will appear here when customers place orders.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => {
            const flow = ORDER_STATUS_FLOW[order.status];
            const isUpdating = updatingOrderId === order.id;
            return (
              <tr key={order.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {order.id.slice(0, 8)}…
                </td>
                <td>
                  <div>{order.customer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(220,10%,50%)' }}>{order.customer_email}</div>
                </td>
                <td style={{ fontWeight: 600, color: 'hsl(160, 84%, 55%)' }}>
                  ₹{Number(order.total_amount).toLocaleString('en-IN')}
                </td>
                <td>
                  <span className={`status-badge status-badge--${order.status}`}>
                    {flow?.label ?? order.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.75rem' }}>
                  {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  {flow?.next && (
                    <button
                      className={`dash-btn ${flow.btnClass}`}
                      disabled={isUpdating}
                      onClick={() => onUpdateStatus(order.id, flow.next!)}
                      id={`order-action-${order.id}`}
                    >
                      {isUpdating ? '⏳' : flow.btnLabel}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
