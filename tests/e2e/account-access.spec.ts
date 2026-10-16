import { test, expect } from './fixtures';

test('a private page redirects anonymous visitors to sign in', async ({ page }) => {
  await page.goto('/settings/profile');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});

test('a suspended account shows the sign-in refusal', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: 'suspended@example.test',
      password: 'Test-password-123!',
    });
    await route.fulfill({
      status: 403,
      json: { error: 'Your account is suspended.', reason: 'suspended' },
    });
  });
  await page.goto('/login');
  await page.getByLabel('Email address').fill('suspended@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Test-password-123!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByText('Your account is suspended.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('vetify.auth'))).toBeNull();
});
