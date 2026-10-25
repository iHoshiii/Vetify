import { authSettings, renderAuthSettings, resetAuthSettings } from './account-auth-fixtures';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/services/api';

beforeEach(resetAuthSettings);

describe('connected login settings', () => {
  it.each(['google', 'facebook', 'tiktok'] as const)(
    'verifies the email before linking %s',
    async (provider) => {
      const name = { google: 'Google', facebook: 'Facebook', tiktok: 'TikTok' }[provider];
      renderAuthSettings();
      fireEvent.click(screen.getByRole('button', { name: `Link ${name}` }));
      await waitFor(() => expect(authSettings.requestCode).toHaveBeenCalledWith(provider));
      fireEvent.change(await screen.findByLabelText('Digit 1 of 6'), {
        target: { value: '012345' },
      });
      fireEvent.click(screen.getByRole('button', { name: `Verify and continue with ${name}` }));
      await waitFor(() => expect(authSettings.verifyCode).toHaveBeenCalledWith(provider, '012345'));
      await waitFor(() =>
        expect(authSettings.open).toHaveBeenCalledWith('https://provider.example/authorize')
      );
    }
  );

  it('rejects an incorrect email code and keeps provider navigation closed', async () => {
    authSettings.verifyCode.mockRejectedValue(
      new ApiError(400, 'The verification code is invalid or expired.', 'email-link-invalid')
    );
    renderAuthSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Link Google' }));
    fireEvent.change(await screen.findByLabelText('Digit 1 of 6'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue with Google' }));
    expect(await screen.findByText('The verification code is invalid or expired.')).toBeVisible();
    expect(authSettings.open).not.toHaveBeenCalled();
  });

  it('shows connected methods and removes their connection form', () => {
    authSettings.data.providers = ['google'];
    renderAuthSettings();
    expect(screen.getByText('Google')).toBeVisible();
    expect(screen.getAllByText('Linked')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Link Google' })).toBeNull();
    expect(screen.getByLabelText('Current password')).toBeVisible();
  });

  it('shows unavailable providers without opening a connection form', () => {
    authSettings.data.availableProviders = [];
    authSettings.data.googleAvailable = false;
    renderAuthSettings();
    expect(screen.getByText('Google sign-in is currently unavailable.')).toBeVisible();
    expect(screen.queryByLabelText('Password to connect Google')).toBeNull();
    expect(screen.getByRole('button', { name: 'Link Google' })).toBeDisabled();
  });

  it('explains that TikTok needs HTTPS and disables its Link button', () => {
    authSettings.data.availableProviders = ['google', 'facebook'];
    authSettings.data.tiktokHttpsReady = false;
    renderAuthSettings();
    expect(
      screen.getByText('TikTok linking will be available when Vetify uses HTTPS.')
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Link TikTok' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Link Facebook' })).toBeEnabled();
    expect(authSettings.requestCode).not.toHaveBeenCalled();
  });

  it('accepts callback notices only when the connected method is present', async () => {
    renderAuthSettings('/settings/security?connection=google-linked');
    expect(screen.queryByText(/Google sign-in is linked/)).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/security')
    );
    expect(screen.getByTestId('location')).not.toHaveTextContent('connection=');
  });

  it('explains provider cancellation without showing a successful connection', () => {
    renderAuthSettings('/settings/security?accountAuthError=denied');
    expect(screen.getByRole('alert')).toHaveTextContent('You cancelled the confirmation.');
    expect(screen.queryByText(/sign-in is linked/)).toBeNull();
  });
});
