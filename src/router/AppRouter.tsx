import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute } from './PublicRoute';
import { PrivateRoute } from './PrivateRoute';

// ── Lazy-loaded auth pages ────────────────────────────────────────────────────
const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);

import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';

// ── Stub Dashboard (placeholder until dashboards are built) ───────────────────
const DashboardStub: React.FC<{ role?: string }> = ({ role = 'Customer' }) => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
      background: 'hsl(220, 15%, 7%)',
      color: 'hsl(220, 15%, 95%)',
    }}>
      {/* Top Navigation Bar with Log Out button */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid hsl(220, 15%, 15%)',
        background: 'rgba(15, 20, 28, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, hsl(262, 83%, 58%), hsl(220, 83%, 58%))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.2rem',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
          }}>
            D
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
            Drip<span style={{ color: 'hsl(262, 83%, 68%)' }}>Now</span>
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'hsl(262, 83%, 58%, 0.15)',
            color: 'hsl(262, 83%, 75%)',
            border: '1px solid hsl(262, 83%, 58%, 0.3)',
            marginLeft: '8px',
          }}>
            {role} Portal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user && (
            <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 600, color: 'hsl(220, 15%, 90%)' }}>{user.full_name || user.email}</div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(220, 10%, 55%)' }}>{user.email}</div>
            </div>
          )}

          <button
            id="logout-btn"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid hsl(0, 72%, 51%, 0.4)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.3))',
              color: '#f87171',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
        padding: '40px 20px',
      }}>
        <div style={{ fontSize: '3.5rem' }}>🎉</div>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '2.25rem', fontWeight: 800 }}>
          {role} Dashboard
        </h1>
        <p style={{ color: 'hsl(220, 10%, 65%)', maxWidth: '480px', textAlign: 'center', lineHeight: '1.6' }}>
          Welcome back! You are logged in as <strong>{user?.full_name || role}</strong>. All system features and role permissions are fully active.
        </p>

        <button
          onClick={handleLogout}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, hsl(262, 83%, 58%), hsl(220, 83%, 58%))',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
          }}
        >
          Log Out & Switch Portal
        </button>
      </main>
    </div>
  );
};

// ── Loading Fallback ──────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'hsl(220, 15%, 7%)',
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid hsl(262, 83%, 58%, 0.3)',
      borderTopColor: 'hsl(262, 83%, 58%)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Root redirect ─────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Public routes (redirect if already logged in) ──── */}
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage portalRole="customer" />
              </PublicRoute>
            }
          />
          <Route
            path="/login/customer"
            element={
              <PublicRoute>
                <LoginPage portalRole="customer" />
              </PublicRoute>
            }
          />
          <Route
            path="/login/shopkeeper"
            element={
              <PublicRoute>
                <LoginPage portalRole="shopkeeper" />
              </PublicRoute>
            }
          />
          <Route
            path="/login/seller"
            element={
              <PublicRoute>
                <LoginPage portalRole="shopkeeper" />
              </PublicRoute>
            }
          />
          <Route
            path="/login/delivery"
            element={
              <PublicRoute>
                <LoginPage portalRole="delivery" />
              </PublicRoute>
            }
          />
          <Route
            path="/login/admin"
            element={
              <PublicRoute>
                <LoginPage portalRole="admin" />
              </PublicRoute>
            }
          />
          <Route
            path="/login/super-admin"
            element={
              <PublicRoute>
                <LoginPage portalRole="super-admin" />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />

          {/* ── Protected routes ──────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={['customer']}>
                <DashboardStub role="Customer" />
              </PrivateRoute>
            }
          />
          <Route
            path="/seller/dashboard"
            element={
              <PrivateRoute allowedRoles={['seller', 'super_admin']}>
                <DashboardStub role="Seller" />
              </PrivateRoute>
            }
          />
          <Route
            path="/delivery/dashboard"
            element={
              <PrivateRoute allowedRoles={['delivery_partner', 'super_admin']}>
                <DashboardStub role="Delivery Partner" />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager/dashboard"
            element={
              <PrivateRoute allowedRoles={['manager', 'super_admin']}>
                <DashboardStub role="Manager" />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute allowedRoles={['super_admin']}>
                <DashboardStub role="Super Admin" />
              </PrivateRoute>
            }
          />

          {/* ── 404 ───────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
