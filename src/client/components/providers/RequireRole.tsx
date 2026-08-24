import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { UserRole } from '@/lib/auth-storage';

import { useAuth } from './AuthProvider';

type RequireRoleProps = {
  /** Roles allowed through. Anything else is redirected. */
  roles: UserRole[];
  children: ReactNode;
};

/**
 * Role gate, layered on top of the same session `RequireAuth` reads.
 *
 * Anonymous visitors go to /login with their destination remembered, exactly as
 * RequireAuth does. A signed-in visitor whose role does not fit is sent home
 * rather than to /login — logging in again would not help them, and bouncing
 * them to a login form they have already satisfied reads as a bug.
 *
 * This hides links and pages. It is not the access control: /admin pages fetch
 * from endpoints that check the stored role server-side, so bypassing this in
 * devtools yields an empty screen of 403s.
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { isAuthenticated, user, status } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  // A stored session still revalidating has a user already, so the role is known
  // and there is nothing to wait for. Only the gap where the token was adopted
  // without a user needs to hold.
  if (status === 'loading' && !user) return null;

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
