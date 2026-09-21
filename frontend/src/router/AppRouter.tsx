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

// ── Stub Dashboard (placeholder until dashboards are built) ───────────────────
const DashboardStub: React.FC<{ role?: string }> = ({ role = 'Customer' }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '16px',
    fontFamily: 'Inter, sans-serif',
    background: 'hsl(220, 15%, 7%)',
    color: 'hsl(220, 15%, 95%)',
  }}>
    <div style={{ fontSize: '3rem' }}>🎉</div>
    <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '2rem', fontWeight: 800 }}>
      {role} Dashboard
    </h1>
    <p style={{ color: 'hsl(220, 10%, 60%)' }}>Coming soon — Auth foundation is working!</p>
  </div>
);

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
