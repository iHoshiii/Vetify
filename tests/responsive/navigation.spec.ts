import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';

test('site navigation fits and all mobile menu actions remain reachable', async ({
  context,
  page,
}) => {
  await installApi(context, 'guest');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const toggle = page.getByRole('button', { name: 'Toggle menu' });
  if (page.viewportSize()!.width >= 1280) {
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(toggle).toBeHidden();
  } else {
    await toggle.click();
    const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
    const signup = menu.getByRole('link', { name: 'Sign up', exact: true });
    await signup.scrollIntoViewIfNeeded();
    await fitsViewport(page, signup);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    await toggle.click();
    await menu.getByRole('link', { name: 'About Us' }).click();
    await expect(page).toHaveURL(/\/#about$/);
    await expect(menu).toHaveCount(0);
  }
  await noPageOverflow(page);
});

test('account, notification, message and logout panels fit the viewport', async ({
  context,
  page,
}) => {
  await installApi(context, 'user');
  await page.goto('/');
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await fitsViewport(page, page.getByRole('region', { name: 'Account menu' }));
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await fitsViewport(page, page.getByRole('region', { name: 'Notifications panel' }));
  await page.getByRole('button', { name: 'Messages', exact: true }).click();
  await fitsViewport(page, page.getByRole('region', { name: 'Messages panel' }));
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page
    .getByRole('region', { name: 'Account menu' })
    .getByRole('button', { name: 'Log out' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Log out' });
  await fitsViewport(page, dialog);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await noPageOverflow(page);
});
