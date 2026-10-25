import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import type { AccountLoginMethods } from '@shared/account-auth';
import PasswordForm from '@/components/settings/consumer/PasswordForm';

const state = vi.hoisted(() => ({
  data: {} as AccountLoginMethods,
  reauthenticate: vi.fn(),
  add: vi.fn(),
  logout: vi.fn(),
  open: vi.fn(),
  refetch: vi.fn(),
  requestCode: vi.fn(),
  verifyCode: vi.fn(),
}));
export const authSettings = state;

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'owner', provider: 'local', email: 'owner@example.com' },
    status: 'authenticated',
    logout: state.logout,
  }),
}));
vi.mock('@/hooks/useAccountLoginMethods', () => ({
  useAccountLoginMethods: () => ({
    data: state.data,
    isLoading: false,
    isError: false,
    refetch: state.refetch,
  }),
  useReauthenticateAccount: () => ({ mutateAsync: state.reauthenticate, isPending: false }),
  useAddAccountPassword: () => ({
    mutateAsync: state.add,
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
  }),
}));
vi.mock('@/hooks/useAccount', () => ({
  useChangePassword: () => ({
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: null,
  }),
}));
vi.mock('@/services/account-auth.service', () => ({
  openAccountAuthUrl: state.open,
  requestAccountLinkCode: state.requestCode,
  verifyAccountLinkCode: state.verifyCode,
}));

export function resetAuthSettings() {
  Object.values(state).forEach((value) => {
    if (typeof value === 'function') value.mockReset();
  });
  state.data = {
    hasPassword: true,
    providers: [],
    googleAvailable: true,
    availableProviders: ['google', 'facebook', 'tiktok'],
    passwordReady: false,
    reauthProvider: null,
  };
  state.reauthenticate.mockResolvedValue({ url: 'https://accounts.google.com/confirm' });
  state.add.mockResolvedValue({ added: true });
  state.logout.mockResolvedValue(undefined);
  state.requestCode.mockImplementation(async () => ({
    sent: true,
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
  }));
  state.verifyCode.mockResolvedValue({ verified: true, url: 'https://provider.example/authorize' });
}

function Location() {
  const location = useLocation();
  return (
    <p data-testid="location">
      {location.pathname}
      {location.search}
      {location.state?.message}
    </p>
  );
}

export function renderAuthSettings(path = '/settings/security') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/settings/security"
          element={
            <>
              <PasswordForm />
              <Location />
            </>
          }
        />
        <Route path="/login" element={<Location />} />
      </Routes>
    </MemoryRouter>
  );
}
