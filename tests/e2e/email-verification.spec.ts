import { test, expect } from './fixtures';

const token = 'a'.repeat(64);

test('a verification link waits for a click, removes its token, and confirms the email', async ({
  page,
}) => {
  let confirmations = 0;
  await page.route('**/api/v1/auth/email-verification/confirm', async (route) => {
    confirmations++;
    expect(route.request().postDataJSON()).toEqual({ token });
    await route.fulfill({ json: { message: 'Your email address is verified.', verified: true } });
  });
  await page.goto(`/verify-email#token=${token}`);
  await expect(page).toHaveURL(/\/verify-email$/);
  await expect(page.getByRole('button', { name: 'Verify email' })).toBeVisible();
  expect(confirmations).toBe(0);
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('status')).toHaveText('Your email address is verified.');
  await expect(page.getByRole('button', { name: 'Verify email' })).toHaveCount(0);
  expect(confirmations).toBe(1);
});

test('an expired verification link directs an anonymous user to sign in for a new link', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/email-verification/confirm', async (route) => {
    await route.fulfill({
      status: 400,
      json: { error: 'This verification link is invalid or expired.' },
    });
  });
  await page.goto(`/verify-email#token=${token}`);
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('alert')).toHaveText('This verification link is invalid or expired.');
  await page.getByRole('link', { name: /Request a new verification link/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email address')).toBeVisible();
});

test('a missing verification token shows a recovery action without confirming', async ({
  page,
}) => {
  await page.goto('/verify-email');
  await expect(page.getByRole('alert')).toHaveText(
    'This verification link is missing or invalid. Please request a new one.'
  );
  await expect(page.getByRole('button', { name: 'Verify email' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Request a new verification link/ })).toHaveAttribute(
    'href',
    '/settings/profile'
  );
});

test('an unverified owner can resend from profile settings without saving a draft name', async ({
  page,
}) => {
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
  await page.route('**/api/v1/notifications/unread', (route) =>
    route.fulfill({ json: { unread: 0 } })
  );
  await page.route('**/api/v1/messages/unread**', (route) =>
    route.fulfill({ json: { unread: 0 } })
  );
  let requests = 0;
  await page.route('**/api/v1/auth/email-verification/request', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBe('Bearer e2e-token');
    requests++;
    await route.fulfill(
      requests === 1
        ? {
            status: 429,
            json: { error: 'Please wait one minute before requesting another verification email.' },
          }
        : { json: { message: 'Verification email sent. Check your inbox and spam folder.' } }
    );
  });
  await page.goto('/settings/profile');
  await expect(page.getByText('Verification pending', { exact: true })).toBeVisible();
  await page.getByLabel('Display name').fill('Draft owner');
  await page.getByRole('button', { name: 'Resend verification email' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Please wait one minute before requesting another verification email.'
  );
  await page.getByRole('button', { name: 'Resend verification email' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Verification email sent. Check your inbox and spam folder.'
  );
  await expect(page.getByLabel('Display name')).toHaveValue('Draft owner');
  expect(requests).toBe(2);
});
