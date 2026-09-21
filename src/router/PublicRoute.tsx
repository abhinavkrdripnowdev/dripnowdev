import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * PublicRoute — redirects authenticated users away from auth pages.
 * e.g., a logged-in user visiting /login gets sent to their dashboard.
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectTo,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated && user) {
    // Redirect to "from" state (if redirected here from a protected route), or default dashboard
    const from = (location.state as { from?: string })?.from;
    return <Navigate to={from ?? redirectTo ?? '/dashboard'} replace />;
  }

  return <>{children}</>;
};
