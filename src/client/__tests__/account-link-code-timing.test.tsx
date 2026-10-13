import { authSettings, renderAuthSettings, resetAuthSettings } from './account-auth-fixtures';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(resetAuthSettings);
afterEach(() => vi.useRealTimers());
describe('link code resend and expiry in Security', () => {
  it('disables resend for sixty seconds and clears the old digits after resending', async () => {
    renderAuthSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Link TikTok' }));
    await screen.findByLabelText('Digit 1 of 6');
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Digit 1 of 6'), { target: { value: '012345' } });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 61_000);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    await waitFor(() => expect(authSettings.requestCode).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText('Digit 1 of 6')).toHaveValue(''));
    expect(authSettings.open).not.toHaveBeenCalled();
  });

  it('disables verification after five minutes without opening the provider', async () => {
    renderAuthSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Link Facebook' }));
    await screen.findByLabelText('Digit 1 of 6');
    fireEvent.change(screen.getByLabelText('Digit 1 of 6'), { target: { value: '012345' } });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 300_001);
    expect(await screen.findByText('This code has expired. Send a new code.')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Verify and continue with Facebook' })
    ).toBeDisabled();
    expect(authSettings.verifyCode).not.toHaveBeenCalled();
    expect(authSettings.open).not.toHaveBeenCalled();
  });

  it('lets a Google account without a password link another social method directly', async () => {
    authSettings.data.hasPassword = false;
    authSettings.data.providers = ['google'];
    renderAuthSettings();
    expect(screen.queryByRole('button', { name: 'Link Google' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Link TikTok' }));
    fireEvent.change(await screen.findByLabelText('Digit 1 of 6'), { target: { value: '012345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue with TikTok' }));
    await waitFor(() => expect(authSettings.open).toHaveBeenCalled());
    expect(screen.queryByLabelText('New password')).toBeNull();
  });

  it('returns to the method list when cancelled without linking anything', async () => {
    renderAuthSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Link Google' }));
    await screen.findByLabelText('Digit 1 of 6');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Digit 1 of 6')).toBeNull();
    expect(screen.getByRole('button', { name: 'Link Facebook' })).toBeEnabled();
    expect(authSettings.verifyCode).not.toHaveBeenCalled();
  });

  it('can cancel Public Login after email verification without setting a password', async () => {
    authSettings.data.hasPassword = false;
    authSettings.data.providers = ['google'];
    authSettings.verifyCode.mockResolvedValue({ verified: true });
    renderAuthSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Link Public Login' }));
    fireEvent.change(await screen.findByLabelText('Digit 1 of 6'), { target: { value: '012345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    await screen.findByLabelText('New password');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel linking' }));
    expect(screen.queryByLabelText('New password')).toBeNull();
    expect(screen.getByRole('button', { name: 'Link Facebook' })).toBeEnabled();
    expect(authSettings.add).not.toHaveBeenCalled();
  });
});
