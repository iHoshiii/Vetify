import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPasswordRecovery, resetPassword } from '@/lib/auth';
import ForgotPasswordPage from '@/pages/password-recovery/forgot-password-page';
import ResetPasswordPage from '@/pages/password-recovery/reset-password-page';

vi.mock('@/lib/auth', () => ({ requestPasswordRecovery: vi.fn(), resetPassword: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

describe('password recovery pages', () => {
  it('requests a link and displays the account-safe confirmation', async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValue({
      message: 'Check your inbox and spam folder.',
    });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'Owner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }));
    await waitFor(() => expect(requestPasswordRecovery).toHaveBeenCalledWith('owner@example.com'));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Check your inbox and spam folder.'
    );
  });

  it('prevents mismatched passwords and saves a valid replacement', async () => {
    const token = 'a'.repeat(64);
    vi.mocked(resetPassword).mockResolvedValue({ message: 'Your password has been changed.' });
    render(
      <MemoryRouter initialEntries={[`/reset-password#token=${token}`]}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'N3wPassword!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Another1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(resetPassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'N3wPassword!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        token,
        password: 'N3wPassword!',
        confirmPassword: 'N3wPassword!',
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Your password has been changed.');
  });

  it('explains a missing link and provides a way to request another', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Please request a new one');
    expect(screen.getByRole('link', { name: 'Request another recovery link' })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });
});
