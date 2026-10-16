import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';

test('logout stays centered after scrolling the home page', async ({ context, page }) => {
  await installApi(context, 'user');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await noPageOverflow(page);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page
    .getByRole('region', { name: 'Account menu' })
    .getByRole('button', { name: 'Log out', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Log out', exact: true });
  await fitsViewport(page, dialog);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
