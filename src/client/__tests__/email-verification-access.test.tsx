import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readAuthState } from '@/lib/auth';
import {
  confirmed,
  mockVerificationApi,
  PENDING,
  renderVerificationAccess,
} from './email-verification-access-fixtures';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('mandatory email confirmation in the browser', () => {
  it.each(['/planner', '/settings/security', '/admin', '/'])(
    'keeps a pending account on verification when opening %s',
    async (path) => {
      mockVerificationApi();
      renderVerificationAccess(path, PENDING);
      expect(await screen.findByRole('heading', { name: 'Confirm your email' })).toBeVisible();
      expect(screen.queryByText('Protected app content')).toBeNull();
      expect(screen.queryByText('Public home content')).toBeNull();
      expect(screen.getByTestId('return-to')).toHaveTextContent(path);
    }
  );

  it('uses the server verification status rather than a cached verified flag', async () => {
    mockVerificationApi();
    renderVerificationAccess('/planner', confirmed());
    expect(screen.queryByText('Protected app content')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Confirm your email' })).toBeVisible();
  });

  it('returns an unverified password login to confirmation and preserves its destination', async () => {
    mockVerificationApi();
    renderVerificationAccess('/login');
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: PENDING.user.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPassword3!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('heading', { name: 'Confirm your email' })).toBeVisible();
    expect(screen.getByTestId('return-to')).toHaveTextContent('/planner');
    expect(screen.queryByText('Protected app content')).toBeNull();
  });

  it('opens the requested app page only after successful code confirmation', async () => {
    mockVerificationApi();
    renderVerificationAccess('/planner', PENDING);
    await screen.findByRole('heading', { name: 'Confirm your email' });
    fireEvent.paste(screen.getByLabelText('Digit 1 of 6'), {
      clipboardData: { getData: () => '012345' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
    expect(await screen.findByText('Protected app content')).toBeVisible();
    expect(readAuthState()?.user?.emailVerified).toBe(true);
  });

  it('lets the user sign out from confirmation and switch accounts', async () => {
    mockVerificationApi();
    renderVerificationAccess('/planner', PENDING);
    await screen.findByRole('heading', { name: 'Confirm your email' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign out and use another account' }));
    await screen.findByRole('button', { name: 'Sign In' });
    expect(screen.getByLabelText('Email address')).toBeVisible();
    expect(readAuthState()).toBeNull();
  });

  it('returns a cached session to confirmation when the API rejects it as unverified', async () => {
    mockVerificationApi(confirmed());
    renderVerificationAccess('/planner', confirmed());
    await screen.findByText('Protected app content');
    fireEvent.click(screen.getByRole('button', { name: 'Request app data' }));
    expect(await screen.findByRole('heading', { name: 'Confirm your email' })).toBeVisible();
    expect(readAuthState()?.user?.emailVerified).toBe(false);
  });

  it.each(['verified', 'social'] as const)(
    'keeps %s accounts able to use the app',
    async (kind) => {
      const session =
        kind === 'verified'
          ? confirmed()
          : { ...PENDING, user: { ...PENDING.user, provider: 'google' as const } };
      mockVerificationApi(session);
      renderVerificationAccess('/planner', session);
      expect(await screen.findByText('Protected app content')).toBeVisible();
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Confirm your email' })).toBeNull()
      );
    }
  );
});
