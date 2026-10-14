import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/components/providers/AuthProvider';
import EmailVerificationGate from '@/components/providers/EmailVerificationGate';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { writeAuthState, type AuthSession } from '@/lib/auth';
import { apiFetch } from '@/services/api';
import LoginForm from '@/pages/login/_components/login-form';
import SignupPage from '@/pages/signup/signup-page';

export const PENDING: AuthSession = {
  accessToken: 'pending-token',
  user: {
    id: '0123456789abcdef01234567',
    email: 'pending@example.com',
    name: 'Owner',
    provider: 'local',
    emailVerified: false,
    avatarUrl: null,
    role: 'user',
  },
};
export const confirmed = (session = PENDING): AuthSession => ({
  ...session,
  user: { ...session.user, emailVerified: true },
});
export const response = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export function mockVerificationApi(serverSession = PENDING) {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const path = String(url);
    if (path.endsWith('/auth/email/verify'))
      return response(200, { user: confirmed(serverSession).user });
    if (path.endsWith('/auth/logout')) return response(200, { loggedOut: true });
    if (path.endsWith('/pets'))
      return response(403, {
        error: 'Confirm your email before using the app.',
        reason: 'email-verification-required',
      });
    return response(200, serverSession);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function PrivatePage() {
  return (
    <>
      <p>Protected app content</p>
      <button onClick={() => void apiFetch('/pets').catch(() => undefined)}>
        Request app data
      </button>
    </>
  );
}
function LocationInfo() {
  const location = useLocation();
  return <p data-testid="return-to">{location.state?.from ?? ''}</p>;
}

export function renderVerificationAccess(path: string, cached?: AuthSession) {
  if (cached) writeAuthState(cached);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <EmailVerificationGate>
          <Routes>
            <Route
              path="/signup"
              element={
                <>
                  <SignupPage />
                  <LocationInfo />
                </>
              }
            />
            <Route path="/login" element={<LoginForm from="/planner" />} />
            <Route path="/" element={<p>Public home content</p>} />
            <Route
              path="*"
              element={
                <RequireAuth>
                  <PrivatePage />
                </RequireAuth>
              }
            />
          </Routes>
        </EmailVerificationGate>
      </AuthProvider>
    </MemoryRouter>
  );
}
