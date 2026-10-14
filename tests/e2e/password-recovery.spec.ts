import { test, expect } from './fixtures';

const token = 'a'.repeat(64);

test('forgot password accepts an email and shows the private recovery reply', async ({ page }) => {
  await page.route('**/api/v1/auth/forgot-password', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: 'owner@example.test' });
    await route.fulfill({
      json: {
        message: 'If this account can reset its password, a recovery link has been sent.',
      },
    });
  });
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email address').fill('Owner@example.test');
  await page.getByRole('button', { name: 'Send recovery link' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'If this account can reset its password, a recovery link has been sent.'
  );
});

test('a recovery link accepts a new password and removes its token from the address', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/reset-password', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      token,
      password: 'New-password-123!',
      confirmPassword: 'New-password-123!',
    });
    await route.fulfill({
      json: { message: 'Your password has been reset. Sign in with your new password.' },
    });
  });
  await page.goto(`/reset-password#token=${token}`);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel('New password', { exact: true }).fill('New-password-123!');
  await page.getByLabel('Confirm new password').fill('New-password-123!');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Your password has been reset. Sign in with your new password.'
  );
});

test('an expired recovery link offers a fresh link', async ({ page }) => {
  await page.route('**/api/v1/auth/reset-password', async (route) => {
    await route.fulfill({
      status: 400,
      json: { error: 'This recovery link is invalid or expired.' },
    });
  });
  await page.goto(`/reset-password#token=${token}`);
  await page.getByLabel('New password', { exact: true }).fill('New-password-123!');
  await page.getByLabel('Confirm new password').fill('New-password-123!');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toHaveText('This recovery link is invalid or expired.');
  await page.getByRole('link', { name: 'Request another recovery link' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});
