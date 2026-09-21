import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/features/auth/types/auth.types';

interface PrivateRouteProps {
  children: React.ReactNode;
  /** If provided, only users with at least one of these roles can access the route. */
  allowedRoles?: UserRole[];
}

/**
 * PrivateRoute — blocks unauthenticated users and optionally enforces role access.
 *
 * IMPORTANT: This is UI-only protection.
 * All protected APIs enforce authorization server-side via middleware.
 * Never rely on this alone for security.
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.some((role) => user.roles.includes(role))) {
    // Authenticated but wrong role — send to their own dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
