import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PasswordForm from '@/components/settings/consumer/PasswordForm';
import { Toggle } from '@/components/settings/consumer/controls';

const mutateAsync = vi.fn();
const logout = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { provider: 'local', email: 'owner@example.com' },
    logout,
  }),
}));

vi.mock('@/hooks/useAccount', () => ({
  useChangePassword: () => ({
    mutateAsync,
    reset: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

describe('customer security settings', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    logout.mockReset();
    mutateAsync.mockResolvedValue(undefined);
    logout.mockResolvedValue(undefined);
  });

  function renderPassword() {
    render(
      <MemoryRouter initialEntries={['/settings/security']}>
        <Routes>
          <Route path="/settings/security" element={<PasswordForm />} />
          <Route path="/login" element={<p>Signed out safely</p>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders and requires a matching password confirmation', async () => {
    renderPassword();
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Current1!' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Stronger2!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Different3!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('The new passwords do not match.')).toBeDefined();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('updates the password, ends the session, and goes to login', async () => {
    renderPassword();
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Current1!' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Stronger2!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Stronger2!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        currentPassword: 'Current1!',
        newPassword: 'Stronger2!',
      })
    );
    expect(logout).toHaveBeenCalled();
    expect(await screen.findByText('Signed out safely')).toBeDefined();
  });
});

describe('customer settings controls', () => {
  it('gives a switch its accessible label and truly disables it', () => {
    render(
      <Toggle
        checked={false}
        onChange={vi.fn()}
        label="Booking updates"
        desc="Requests and confirmations."
        disabled
      />
    );
    const toggle = screen.getByRole('switch', { name: 'Booking updates' });
    expect(toggle.getAttribute('aria-describedby')).toBeTruthy();
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
  });
});
