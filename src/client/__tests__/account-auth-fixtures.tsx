import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import type { AccountLoginMethods } from '@shared/account-auth';
import PasswordForm from '@/components/settings/consumer/PasswordForm';

const state = vi.hoisted(() => ({
  data: {} as AccountLoginMethods,
  connect: vi.fn(),
  reauthenticate: vi.fn(),
  add: vi.fn(),
  logout: vi.fn(),
  open: vi.fn(),
  refetch: vi.fn(),
}));
export const authSettings = state;

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'owner', provider: 'local' },
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
  useConnectAccountProvider: () => ({
    mutateAsync: state.connect,
    reset: vi.fn(),
    isPending: false,
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
vi.mock('@/services/account-auth.service', () => ({ openAccountAuthUrl: state.open }));

export function resetAuthSettings() {
  Object.values(state).forEach((value) => {
    if (typeof value === 'function') value.mockReset();
  });
  state.data = {
    hasPassword: true,
    providers: [],
    googleAvailable: true,
    availableProviders: ['google', 'facebook'],
    passwordReady: false,
    reauthProvider: null,
  };
  state.connect.mockResolvedValue({ url: 'https://accounts.google.com/authorize' });
  state.reauthenticate.mockResolvedValue({ url: 'https://accounts.google.com/confirm' });
  state.add.mockResolvedValue({ added: true });
  state.logout.mockResolvedValue(undefined);
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
