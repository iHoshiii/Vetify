import { act, fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { authSettings, renderAuthSettings, resetAuthSettings } from './account-auth-fixtures';

beforeEach(resetAuthSettings);

describe('sign-in method linking popup', () => {
  it('opens verification outside the settings card and restores focus and scrolling on Escape', async () => {
    const view = renderAuthSettings();
    const trigger = screen.getByRole('button', { name: 'Link Google' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Link Google' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(view.container.contains(dialog)).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
    expect(await within(dialog).findByLabelText('Digit 1 of 6')).toBeVisible();
    expect(authSettings.requestCode).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
    expect(authSettings.verifyCode).not.toHaveBeenCalled();
  });

  it.each(['Close linking popup', 'Cancel'])(
    'dismisses through %s without linking',
    async (name) => {
      renderAuthSettings();
      fireEvent.click(screen.getByRole('button', { name: 'Link Facebook' }));
      const dialog = screen.getByRole('dialog', { name: 'Link Facebook' });
      await within(dialog).findByLabelText('Digit 1 of 6');
      fireEvent.click(within(dialog).getByRole('button', { name }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(authSettings.verifyCode).not.toHaveBeenCalled();
      expect(authSettings.open).not.toHaveBeenCalled();
    }
  );

  it('keeps the Public Login password step inside the same popup', async () => {
    authSettings.data.hasPassword = false;
    authSettings.data.providers = ['google'];
    authSettings.verifyCode.mockResolvedValue({ verified: true });
    renderAuthSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Link Public Login' }));
    const dialog = screen.getByRole('dialog', { name: 'Link Public Login' });
    fireEvent.change(await within(dialog).findByLabelText('Digit 1 of 6'), {
      target: { value: '012345' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Verify email' }));
    expect(await within(dialog).findByLabelText('New password')).toBeVisible();
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(within(dialog).queryByLabelText('Digit 1 of 6')).toBeNull();
  });

  it('does not navigate to a provider after closing during verification', async () => {
    let finish!: (value: { verified: true; url: string }) => void;
    authSettings.verifyCode.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    renderAuthSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Link Google' }));
    fireEvent.change(await screen.findByLabelText('Digit 1 of 6'), { target: { value: '012345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue with Google' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close linking popup' }));
    await act(async () => {
      finish({ verified: true, url: 'https://provider.example/authorize' });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(authSettings.open).not.toHaveBeenCalled();
  });
});
