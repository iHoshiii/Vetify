import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EmailVerificationForm from '@/pages/signup/_components/email-verification-form';
import { delivery, response, SESSION } from './email-verification-fixtures';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('email confirmation form', () => {
  it('shows invalid code errors and allows a corrected retry', async () => {
    const verified = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(400, { error: 'The confirmation code is invalid or expired.' })
      )
      .mockResolvedValueOnce(response(200, { user: { ...SESSION.user, emailVerified: true } }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <EmailVerificationForm
        email={SESSION.user.email}
        initialDelivery={delivery()}
        onVerified={verified}
      />
    );
    fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or expired');
    expect(verified).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '012345' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
    });
    expect(verified).toHaveBeenCalledWith({ ...SESSION.user, emailVerified: true });
  });

  it('counts down resends and replaces an expired code with a fresh delivery', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T02:00:00Z'));
    const initial = {
      ...delivery(true, 60),
      expiresAt: new Date(Date.now() + 90_000).toISOString(),
    };
    const fetchMock = vi.fn().mockImplementation(async () => response(200, delivery()));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <EmailVerificationForm
        email={SESSION.user.email}
        initialDelivery={initial}
        onVerified={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '123456' } });
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(screen.getByText(/Your code has expired/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm email' })).toBeDisabled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    });
    expect(screen.getByLabelText('Confirmation code')).toHaveValue('');
    expect(screen.queryByText(/Your code has expired/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm email' })).toBeEnabled();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/auth/email/resend');
  });

  it('shows send errors without claiming a delivery or exposing server settings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(503, { error: 'MAIL_API_KEY missing' }))
    );
    render(<EmailVerificationForm email={SESSION.user.email} onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not send the confirmation email'
    );
    expect(screen.queryByText(/MAIL_API_KEY/)).toBeNull();
    expect(screen.queryByText(/We sent a six-digit/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Send code' })).toBeEnabled();
  });

  it('treats a successful resend response with sentfalse as unavailable delivery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, delivery(false, 0))));
    render(<EmailVerificationForm email={SESSION.user.email} onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(
      await screen.findByText(/We couldn't send the confirmation email to/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/We sent a six-digit/)).toBeNull();
  });
});
