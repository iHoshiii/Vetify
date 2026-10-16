import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';

test('email linking stays in a popup with six usable code boxes', async ({ context, page }) => {
  await installApi(context, 'user');
  await page.goto('/settings/security');
  await page.getByRole('button', { name: 'Link Public Login', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Link Public Login', exact: true });
  await fitsViewport(page, dialog);
  const digits = dialog.locator('input[inputmode="numeric"]');
  await expect(digits).toHaveCount(6);
  await digits.first().fill('1');
  await expect(digits.nth(1)).toBeFocused();
  for (let index = 1; index < 6; index++) await digits.nth(index).fill(String(index + 1));
  await dialog.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(dialog.getByLabel('New password', { exact: true })).toBeVisible();
  await fitsViewport(page, dialog);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await noPageOverflow(page);
});

test('conversation opens, sends a message and returns to the list', async ({ context, page }) => {
  await installApi(context, 'user');
  await page.goto('/messages');
  await page
    .getByRole('button', { name: /Dr Alexandra Responsive/ })
    .first()
    .click();
  const composer = page.getByRole('textbox');
  await composer.fill('My pet is feeling better today.');
  const send = page.getByRole('button', { name: 'Send message', exact: true });
  await fitsViewport(page, send);
  await send.click();
  await expect(page.getByText('My pet is feeling better today.', { exact: true })).toBeVisible();
  const back = page.getByRole('button', { name: 'Back to conversations', exact: true });
  if (page.viewportSize()!.width < 1024) {
    await back.click();
    await expect(
      page.getByRole('button', { name: /Dr Alexandra Responsive/ }).first()
    ).toBeVisible();
  }
  await noPageOverflow(page);
});

test('booking directory and appointment popup stay inside the viewport', async ({
  context,
  page,
}) => {
  await installApi(context, 'user');
  await page.goto('/book-appointment');
  await page.getByRole('button', { name: /Your appointments/i }).click();
  const appointments = page.getByRole('dialog');
  await fitsViewport(page, appointments);
  const lastTab = appointments.getByRole('tab', { name: 'Completed', exact: true });
  await lastTab.scrollIntoViewIfNeeded();
  await fitsViewport(page, lastTab);
  await appointments.getByRole('button', { name: 'Close appointments', exact: true }).click();
  await page.getByRole('button', { name: /View all vets/i }).click();
  const directory = page.getByRole('dialog', { name: 'All vet professionals', exact: true });
  await fitsViewport(page, directory);
  const next = directory.getByRole('button', { name: 'Next', exact: true });
  await next.scrollIntoViewIfNeeded();
  await fitsViewport(page, next);
  await next.click();
  await expect(directory.getByText('Page 2 of 3', { exact: true })).toBeVisible();
  await fitsViewport(page, directory.getByRole('button', { name: 'Close', exact: true }).last());
  await noPageOverflow(page);
});

test('expanded map can be opened and closed', async ({ context, page }) => {
  await installApi(context, 'user');
  await page.goto('/map');
  await page.getByRole('button', { name: /Explore the interactive vet map|Open the map/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Map of nearby vets and clinics' });
  await fitsViewport(page, dialog);
  await dialog.getByRole('button', { name: /Close/ }).click();
  await expect(dialog).toHaveCount(0);
  await noPageOverflow(page);
});

test('admin table scrolls locally and long details can be read', async ({ context, page }) => {
  await installApi(context, 'admin');
  await page.goto('/admin/applications');
  const view = page.getByRole('button', { name: 'Read the enquiry', exact: true });
  await view.click();
  const dialog = page.getByRole('dialog');
  await fitsViewport(page, dialog);
  const close = dialog.getByRole('button', { name: 'Close', exact: true }).last();
  await close.scrollIntoViewIfNeeded();
  await fitsViewport(page, close);
  await close.click();
  await noPageOverflow(page);
});

test('professional schedule times can be edited without widening the page', async ({
  context,
  page,
}) => {
  await installApi(context, 'professional');
  await page.goto('/professionals/dashboard/settings');
  await page.getByRole('button', { name: /Availability Available/ }).click();
  const times = page.locator('input[type="time"]');
  await expect(times.first()).toBeVisible();
  await times.first().scrollIntoViewIfNeeded();
  await fitsViewport(page, times.first());
  await times.first().fill('09:30');
  await expect(times.first()).toHaveValue('09:30');
  await times.last().scrollIntoViewIfNeeded();
  await fitsViewport(page, times.last());
  await noPageOverflow(page);
});

test('linking popup adapts when the available viewport height changes', async ({
  context,
  page,
}) => {
  await installApi(context, 'user');
  await page.goto('/settings/security');
  await page.getByRole('button', { name: 'Link Public Login', exact: true }).click();
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width, height: 260 });
  const dialog = page.getByRole('dialog', { name: 'Link Public Login', exact: true });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.style.getPropertyValue('--viewport-height'))
    )
    .toBe('260px');
  await fitsViewport(page, dialog);
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  await cancel.scrollIntoViewIfNeeded();
  await fitsViewport(page, cancel);
  await cancel.click();
  await expect(dialog).toHaveCount(0);
});
