import { authSettings, renderAuthSettings, resetAuthSettings } from './account-auth-fixtures';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/services/api';

beforeEach(() => {
  resetAuthSettings();
  authSettings.data = {
    ...authSettings.data,
    hasPassword: false,
    providers: ['google'],
    reauthProvider: 'google',
  };
});

const fillPassword = (password = 'StrongPassword3!', confirm = password) => {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirm } });
};

describe('adding a password in security settings', () => {
  it('verifies an email code before showing Public Login password fields', async () => {
    authSettings.verifyCode.mockResolvedValue({ verified: true });
    renderAuthSettings();
    expect(screen.queryByLabelText('New password')).toBeNull();
    expect(screen.queryByLabelText('Current password')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Link Public Login' }));
    await waitFor(() => expect(authSettings.requestCode).toHaveBeenCalledWith('local'));
    fireEvent.change(await screen.findByLabelText('Digit 1 of 6'), { target: { value: '012345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(await screen.findByLabelText('New password')).toBeVisible();
    expect(authSettings.reauthenticate).not.toHaveBeenCalled();
    expect(authSettings.add).not.toHaveBeenCalled();
  });

  it('validates strength and matching confirmation before submitting', async () => {
    authSettings.data.passwordReady = true;
    renderAuthSettings();
    fillPassword('weak');
    fireEvent.click(screen.getByRole('button', { name: 'Add password' }));
    expect(authSettings.add).not.toHaveBeenCalled();
    fillPassword('StrongPassword3!', 'OtherPassword4!');
    fireEvent.click(screen.getByRole('button', { name: 'Add password' }));
    expect(await screen.findByText('Passwords do not match')).toBeVisible();
    expect(authSettings.add).not.toHaveBeenCalled();
  });

  it('adds the password, logs out, and explains how to sign in again', async () => {
    authSettings.data.passwordReady = true;
    renderAuthSettings('/settings/security?auth=password-ready');
    expect(screen.getByText('Sign-in confirmed. You can now add a password.')).toBeVisible();
    fillPassword();
    fireEvent.click(screen.getByRole('button', { name: 'Add password' }));
    await waitFor(() =>
      expect(authSettings.add).toHaveBeenCalledWith({
        newPassword: 'StrongPassword3!',
        confirmPassword: 'StrongPassword3!',
      })
    );
    await waitFor(() => expect(authSettings.logout).toHaveBeenCalled());
    expect(
      await screen.findByText('/loginPassword added. Sign in again with your email and password.')
    ).toBeVisible();
  });

  it('requires confirmation again after the proof expires', async () => {
    authSettings.data.passwordReady = true;
    authSettings.add.mockRejectedValue(new ApiError(403, 'Expired', 'reauth-required'));
    renderAuthSettings();
    fillPassword();
    fireEvent.click(screen.getByRole('button', { name: 'Add password' }));
    await waitFor(() => expect(authSettings.refetch).toHaveBeenCalled());
    expect(await screen.findByLabelText('Digit 1 of 6')).toBeVisible();
    expect(authSettings.requestCode).toHaveBeenCalledWith('local');
    expect(authSettings.logout).not.toHaveBeenCalled();
  });
});
