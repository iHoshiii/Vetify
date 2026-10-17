import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

const session = {
  accessToken: 'e2e-token',
  user: {
    id: 'owner',
    email: 'owner@example.test',
    name: 'Owner',
    provider: 'local',
    role: 'user',
    avatarUrl: null,
    emailVerified: false,
  },
};

async function unverifiedOwner(page: Page) {
  await page.addInitScript(
    (stored) => sessionStorage.setItem('vetify.auth', JSON.stringify(stored)),
    session
  );
  await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({ json: session }));
  await page.route('**/api/v1/account/preferences', (route) =>
    route.fulfill({
      json: {
        preferences: {
          notifications: {
            enabled: true,
            categories: { bookings: true, reminders: true, reviews: true },
            dnd: { enabled: false, start: '22:00', end: '07:00' },
          },
          privacy: { blockedUserIds: [] },
          region: { timeZone: 'Asia/Manila' },
        },
      },
    })
  );
  await page.route('**/api/v1/account/realtime-ticket', (route) =>
    route.fulfill({ status: 503, json: { error: 'Realtime is unavailable in this test.' } })
  );
  await page.route('**/api/v1/notifications/unread', (route) =>
    route.fulfill({ json: { unread: 0 } })
  );
  await page.route('**/api/v1/messages/unread**', (route) =>
    route.fulfill({ json: { unread: 0 } })
  );
}

test('an unverified owner confirms a six-digit code before returning to their destination', async ({
  page,
}) => {
  await unverifiedOwner(page);
  let confirmations = 0;
  await page.route('**/api/v1/auth/email/verify', async (route) => {
    confirmations++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBe('Bearer e2e-token');
    expect(route.request().postDataJSON()).toEqual({ code: '012345' });
    await route.fulfill({ json: { user: { ...session.user, emailVerified: true } } });
  });
  await page.goto('/help');
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm email', exact: true })).toBeDisabled();
  expect(confirmations).toBe(0);
  await page.getByLabel('Digit 1 of 6').fill('012345');
  await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
  await expect(page).toHaveURL(/\/help$/);
  expect(confirmations).toBe(1);
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('vetify.auth')!).user.emailVerified)
  ).toBe(true);
});

test('an expired confirmation code keeps the owner on signup and offers a new code', async ({
  page,
}) => {
  await unverifiedOwner(page);
  await page.route('**/api/v1/auth/email/verify', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ code: '123456' });
    await route.fulfill({
      status: 400,
      json: { error: 'This confirmation code is invalid or expired.' },
    });
  });
  await page.goto('/signup');
  await page.getByLabel('Digit 1 of 6').fill('123456');
  await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('This confirmation code is invalid or expired.');
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('button', { name: 'Send code', exact: true })).toBeEnabled();
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('vetify.auth')!).user.emailVerified)
  ).toBe(false);
});

test('a legacy verification link redirects to signup without submitting its token', async ({
  page,
}) => {
  await page.goto(`/verify-email#token=${'a'.repeat(64)}`);
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Create Account', exact: true })).toBeVisible();
});

test('an unverified owner can retry sending a code and must wait before resending', async ({
  page,
}) => {
  await unverifiedOwner(page);
  let requests = 0;
  await page.route('**/api/v1/auth/email/resend', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBe('Bearer e2e-token');
    expect(route.request().postDataJSON()).toEqual({});
    requests++;
    await route.fulfill(
      requests === 1
        ? {
            status: 429,
            json: { error: 'Please wait one minute before requesting another confirmation email.' },
          }
        : {
            json: {
              sent: true,
              expiresAt: new Date(Date.now() + 600000).toISOString(),
              resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
            },
          }
    );
  });
  await page.goto('/settings/profile');
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByLabel('Digit 1 of 6').fill('123456');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Please wait one minute before requesting another confirmation email.'
  );
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('We sent a six-digit confirmation code to');
  await expect(page.getByRole('status')).toContainText('owner@example.test');
  await expect(page.getByRole('button', { name: /Resend code in \d+s/ })).toBeDisabled();
  await expect(page.getByLabel('Digit 1 of 6')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Confirm email', exact: true })).toBeDisabled();
  expect(requests).toBe(2);
});
