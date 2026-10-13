import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readAuthState, writeAuthState } from '@/lib/auth';
import { delivery, renderSignup, response, SESSION } from './email-verification-fixtures';

vi.mock('@/pages/signup/_components/password-strength', () => ({
  default: () => null,
  NO_PASSWORD: { score: 0 },
  evaluatePasswordStrength: vi.fn().mockResolvedValue({ score: 0 }),
}));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

async function createAccount() {
  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: SESSION.user.name } });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: SESSION.user.email },
  });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'HarbourCloud77!' } });
  fireEvent.change(screen.getByLabelText('Re-enter password'), {
    target: { value: 'HarbourCloud77!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  await screen.findByRole('heading', { name: 'Confirm your email' });
}

describe('local signup email confirmation', () => {
  it('shows the code step and returns only after confirming the email', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(201, { ...SESSION, emailVerification: delivery() }))
      .mockResolvedValueOnce(response(200, { user: { ...SESSION.user, emailVerified: true } }));
    vi.stubGlobal('fetch', fetchMock);
    renderSignup();
    await createAccount();

    expect(screen.getByText(/We sent a six-digit confirmation code to/)).toBeInTheDocument();
    expect(screen.queryByText('Planner destination')).toBeNull();
    expect(screen.queryByLabelText('Full Name')).toBeNull();
    expect(screen.queryByText('Or sign up with')).toBeNull();
    expect(readAuthState()?.user?.emailVerified).toBe(false);
    const input = screen.getByLabelText('Confirmation code');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(input, { target: { value: '012345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));

    await screen.findByText('Planner destination');
    expect(readAuthState()?.user?.emailVerified).toBe(true);
    expect(readAuthState()?.accessToken).toBe(SESSION.accessToken);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/email/verify');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${SESSION.accessToken}`);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ code: '012345' });
  });

  it('reports unavailable delivery without claiming the email was sent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(201, { ...SESSION, emailVerification: delivery(false) }))
    );
    renderSignup();
    await createAccount();

    expect(screen.getByText(/We couldn't send the confirmation email to/)).toBeInTheDocument();
    expect(screen.queryByText(/We sent a six-digit/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
  });

  it('lets an existing unverified account request a code and rejects unsafe return paths', async () => {
    writeAuthState(SESSION);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, SESSION))
      .mockResolvedValueOnce(response(200, delivery()))
      .mockResolvedValueOnce(response(200, { user: { ...SESSION.user, emailVerified: true } }));
    vi.stubGlobal('fetch', fetchMock);
    renderSignup('//untrusted.example');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByText(/We sent a six-digit/);
    fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));

    await screen.findByText('Home destination');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/email/resend');
  });

  it('keeps signup validation and does not call the server for mismatched passwords', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderSignup();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Pet Owner' } });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'pet@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'HarbourCloud77!' } });
    fireEvent.change(screen.getByLabelText('Re-enter password'), {
      target: { value: 'Different77!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please correct the highlighted fields'
    );
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
