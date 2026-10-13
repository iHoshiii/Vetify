import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EmailVerificationForm from '@/pages/signup/_components/email-verification-form';
import {
  codeInputs,
  delivery,
  fillConfirmationCode,
  response,
  SESSION,
} from './email-verification-fixtures';

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
    fillConfirmationCode('111111');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or expired');
    expect(verified).not.toHaveBeenCalled();
    fillConfirmationCode('012345');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
    });
    expect(verified).toHaveBeenCalledWith({ ...SESSION.user, emailVerified: true });
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, delivery(false))));
    render(<EmailVerificationForm email={SESSION.user.email} onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(
      await screen.findByText(/We couldn't send the confirmation email to/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/We sent a six-digit/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
  });

  it('enables confirmation only after all six boxes are filled and never submits automatically', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(
      <EmailVerificationForm
        email={SESSION.user.email}
        initialDelivery={delivery()}
        onVerified={vi.fn()}
      />
    );
    const confirm = screen.getByRole('button', { name: 'Confirm email' });
    expect(confirm).toBeDisabled();
    fillConfirmationCode('01234');
    expect(confirm).toBeDisabled();
    fireEvent.change(codeInputs()[5], { target: { value: '5' } });
    expect(confirm).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('disables all six boxes while waiting for the confirmation response', async () => {
    let finish: (result: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          })
      )
    );
    const verified = vi.fn();
    render(
      <EmailVerificationForm
        email={SESSION.user.email}
        initialDelivery={delivery()}
        onVerified={verified}
      />
    );
    fillConfirmationCode('012345');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
    codeInputs().forEach((input) => expect(input).toBeDisabled());
    expect(verified).not.toHaveBeenCalled();
    await act(async () => {
      finish(response(200, { user: { ...SESSION.user, emailVerified: true } }));
    });
    expect(verified).toHaveBeenCalledWith({ ...SESSION.user, emailVerified: true });
  });
});
