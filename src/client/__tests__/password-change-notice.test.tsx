import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PasswordForm from '@/components/settings/consumer/PasswordForm';
import LoginPage from '@/pages/login/login-page';

const mutateAsync = vi.fn();
const logout = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { provider: 'local' }, logout }),
}));
vi.mock('@/hooks/useAccount', () => ({
  useChangePassword: () => ({ mutateAsync, reset: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useAccountLoginMethods', () => ({
  useAccountLoginMethods: () => ({
    data: {
      hasPassword: true,
      providers: [],
      availableProviders: [],
      googleAvailable: false,
      passwordReady: false,
      reauthProvider: null,
    },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('@/pages/login/_components/login-form', () => ({ default: () => <div>Sign-in form</div> }));
vi.mock('@/pages/login/_components/social-login', () => ({ default: () => null }));

beforeEach(() => {
  window.sessionStorage.clear();
  mutateAsync.mockReset().mockResolvedValue(undefined);
  logout.mockReset().mockResolvedValue(undefined);
});

describe('password-change confirmation', () => {
  it('shows the successful password change when the form redirects to login', async () => {
    render(
      <MemoryRouter initialEntries={['/settings/security']}>
        <Routes>
          <Route path="/settings/security" element={<PasswordForm />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );
    for (const [label, value] of [
      ['Current password', 'Current1!'],
      ['New password', 'Updated2!'],
      ['Confirm new password', 'Updated2!'],
    ]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Password updated. Sign in again on this device.'
    );
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sign-in form')).toBeInTheDocument();
  });

  it('keeps the protected-page sign-in instruction when there is no success message', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/map' } }]}>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Please log in to find nearby vets.');
  });

  it('keeps an OAuth failure visible ahead of a previous success notice', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            search: '?error=oauth&reason=denied',
            state: { message: 'Password updated.' },
          },
        ]}
      >
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'You cancelled the sign-in before it finished.'
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
