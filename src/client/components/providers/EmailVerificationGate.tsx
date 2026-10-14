import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { needsEmailVerification } from '@shared/email-verification';
import { useAuth } from './AuthProvider';

export default function EmailVerificationGate({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading' && user?.provider === 'local') return null;
  if (needsEmailVerification(user) && location.pathname !== '/signup') {
    const from =
      (location.state as { from?: string } | null)?.from ??
      `${location.pathname}${location.search}`;
    return <Navigate to="/signup" replace state={{ from }} />;
  }
  return <>{children}</>;
}
