import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './AuthProvider';

/**
 * Gate for routes that need an account. Sends anonymous visitors to /login and
 * remembers where they were headed, so logging in drops them at the page they
 * actually wanted rather than the home page.
 *
 * No separate loading branch on purpose: isAuthenticated already counts a
 * stored session that is still revalidating, so a signed-in user reloading
 * straight onto a protected URL is not bounced. If that revalidation then
 * fails, this redirects — which is the correct outcome, just deferred.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  return <>{children}</>;
}
