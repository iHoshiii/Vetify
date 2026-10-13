import { authSettings, renderAuthSettings, resetAuthSettings } from './account-auth-fixtures';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/services/api';

beforeEach(resetAuthSettings);

describe('connected login settings', () => {
  it.each(['google', 'facebook'] as const)(
    'confirms the password before connecting %s',
    async (provider) => {
      const name = provider === 'google' ? 'Google' : 'Facebook';
      renderAuthSettings();
      const button = screen.getByRole('button', { name: `Connect ${name}` });
      expect(button).toBeDisabled();
      fireEvent.change(screen.getByLabelText(`Password to connect ${name}`), {
        target: { value: 'CurrentPassword2!' },
      });
      fireEvent.click(button);
      await waitFor(() =>
        expect(authSettings.connect).toHaveBeenCalledWith({
          provider,
          currentPassword: 'CurrentPassword2!',
        })
      );
      await waitFor(() =>
        expect(authSettings.open).toHaveBeenCalledWith('https://accounts.google.com/authorize')
      );
      expect(screen.getByLabelText(`Password to connect ${name}`)).toHaveValue('');
    }
  );

  it('reports a wrong password and keeps the provider navigation closed', async () => {
    authSettings.connect.mockRejectedValue(new ApiError(400, 'Incorrect', 'password-incorrect'));
    renderAuthSettings();
    fireEvent.change(screen.getByLabelText('Password to connect Google'), {
      target: { value: 'Wrong!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google' }));
    expect(
      await screen.findByText('Your current password is incorrect. Please try again.')
    ).toBeVisible();
    expect(authSettings.open).not.toHaveBeenCalled();
  });

  it('shows connected methods and removes their connection form', () => {
    authSettings.data.providers = ['google'];
    renderAuthSettings();
    expect(screen.getByText('Google')).toBeVisible();
    expect(screen.getByText('Connected')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Connect Google' })).toBeNull();
    expect(screen.getByLabelText('Current password')).toBeVisible();
  });

  it('shows unavailable providers without opening a connection form', () => {
    authSettings.data.availableProviders = [];
    authSettings.data.googleAvailable = false;
    renderAuthSettings();
    expect(
      screen.getByText('Google sign-in is currently unavailable. Please try again later.')
    ).toBeVisible();
    expect(screen.queryByLabelText('Password to connect Google')).toBeNull();
  });

  it('accepts callback notices only when the connected method is present', async () => {
    renderAuthSettings('/settings/security?connection=google-linked');
    expect(screen.queryByText(/Google sign-in is connected/)).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/security')
    );
    expect(screen.getByTestId('location')).not.toHaveTextContent('connection=');
  });

  it('explains provider cancellation without showing a successful connection', () => {
    renderAuthSettings('/settings/security?accountAuthError=denied');
    expect(screen.getByRole('alert')).toHaveTextContent('You cancelled the confirmation.');
    expect(screen.queryByText(/sign-in is connected/)).toBeNull();
  });
});
