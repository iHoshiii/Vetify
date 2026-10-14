import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from '@/lib/auth-storage';
import VerifyEmailPage from '@/pages/email-verification/verify-email-page';
import { confirmEmailVerification } from '@/services/email-verification.service';
import { refreshSession } from '@/lib/auth';

const state = vi.hoisted(() => ({ session: null as AuthState | null }));
vi.mock('@/services/email-verification.service', () => ({ confirmEmailVerification: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  readAuthState: () => state.session,
  refreshSession: vi.fn(),
}));
const token = 'a'.repeat(64);

function draw(path = `/verify-email#token=${token}`) {
  window.history.replaceState(null, '', path);
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </StrictMode>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  state.session = null;
  vi.mocked(confirmEmailVerification).mockResolvedValue({
    message: 'Email verified.',
    verified: true,
  });
});

describe('email verification', () => {
  it('waits for explicit confirmation under StrictMode, removes the hash, and submits once', async () => {
    let finish!: (response: { message: string; verified: true }) => void;
    vi.mocked(confirmEmailVerification).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    draw();
    expect(window.location.hash).toBe('');
    expect(confirmEmailVerification).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(screen.getByRole('button', { name: 'Verify email' })).toBeDisabled();
    expect(confirmEmailVerification).toHaveBeenCalledOnce();
    expect(confirmEmailVerification).toHaveBeenCalledWith({ token });
    await act(async () => finish({ message: 'Email verified.', verified: true }));
    expect(screen.getByRole('status')).toHaveTextContent('Email verified.');
    expect(screen.queryByRole('button', { name: 'Verify email' })).not.toBeInTheDocument();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it.each(['/verify-email', '/verify-email#token=bad'])(
    'offers another link for %s without a request',
    (path) => {
      draw(path);
      expect(screen.getByRole('alert')).toHaveTextContent('missing or invalid');
      expect(screen.getByRole('link', { name: /Request a new verification link/ })).toHaveAttribute(
        'href',
        '/settings/profile'
      );
      expect(screen.queryByRole('button', { name: 'Verify email' })).not.toBeInTheDocument();
      expect(confirmEmailVerification).not.toHaveBeenCalled();
    }
  );

  it('shows expired/replayed-link errors and permits a retry', async () => {
    vi.mocked(confirmEmailVerification).mockRejectedValueOnce(
      new Error('This verification link is invalid or expired.')
    );
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or expired');
    expect(screen.getByRole('button', { name: 'Verify email' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Email verified.');
  });

  it('retains successful verification when refreshing a signed-in session fails', async () => {
    state.session = {
      accessToken: 'stored-token',
      user: { id: 'owner' } as NonNullable<AuthState['user']>,
    };
    vi.mocked(refreshSession).mockRejectedValue(new Error('Offline'));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    await waitFor(() => expect(refreshSession).toHaveBeenCalledOnce());
    expect(screen.getByText('Email verified.')).toBeInTheDocument();
    expect(await screen.findByText(/Sign in again to refresh/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify email' })).not.toBeInTheDocument();
  });
});
