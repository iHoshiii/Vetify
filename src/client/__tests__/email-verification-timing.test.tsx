import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EmailVerificationForm from '@/pages/signup/_components/email-verification-form';
import { delivery, response, SESSION } from './email-verification-fixtures';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T02:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderForm(sent = true) {
  return render(
    <EmailVerificationForm
      email={SESSION.user.email}
      initialDelivery={delivery(sent)}
      onVerified={vi.fn()}
    />
  );
}

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

describe('email confirmation timing', () => {
  it('enforces sixty seconds between sends and expires codes at five minutes', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => response(200, delivery()));
    vi.stubGlobal('fetch', fetchMock);
    renderForm();
    expect(screen.getByText('Your code expires in 5 minutes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '123456' } });

    advance(59_000);
    const blocked = screen.getByRole('button', { name: 'Resend code in 1s' });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(fetchMock).not.toHaveBeenCalled();
    advance(1000);
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
    expect(screen.getByText('Your code expires in 4 minutes.')).toBeInTheDocument();

    advance(239_000);
    expect(screen.queryByText(/Your code has expired/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirm email' })).toBeEnabled();
    advance(1000);
    expect(screen.getByText(/Your code has expired/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm email' })).toBeDisabled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    });

    expect(screen.getByLabelText('Confirmation code')).toHaveValue('');
    expect(screen.getByText('Your code expires in 5 minutes.')).toBeInTheDocument();
    expect(screen.queryByText(/Your code has expired/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm email' })).toBeEnabled();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/auth/email/resend');
  });

  it('keeps the sixty-second cooldown when delivery fails and clears the old code on retry', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => response(200, delivery(false)));
    vi.stubGlobal('fetch', fetchMock);
    renderForm(false);
    expect(screen.getByText(/We couldn't send the confirmation email to/)).toBeInTheDocument();
    expect(screen.queryByText(/We sent a six-digit/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Confirmation code'), { target: { value: '012345' } });
    advance(59_000);
    const blocked = screen.getByRole('button', { name: 'Resend code in 1s' });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(fetchMock).not.toHaveBeenCalled();
    advance(1000);
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Confirmation code')).toHaveValue('');
    expect(screen.queryByText(/We sent a six-digit/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
  });
});
