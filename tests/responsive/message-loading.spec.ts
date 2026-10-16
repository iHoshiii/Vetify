import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { message, pageOf } from './data';

test('a message waits for the initial conversation to finish loading', async ({
  context,
  page,
}) => {
  await installApi(context, 'user');
  let release: () => void = () => {};
  const loaded = new Promise<void>((resolve) => {
    release = resolve;
  });
  await context.route('**/api/v1/messages/*/messages', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await loaded;
    await route.fulfill({ json: { ...pageOf(message), otherReadAt: null } });
  });
  await page.goto('/messages');
  await page
    .getByRole('button', { name: /Dr Alexandra Responsive/ })
    .first()
    .click();
  await page.getByRole('textbox').fill('A message written while loading.');
  const send = page.getByRole('button', { name: 'Send message', exact: true });
  await expect(send).toBeDisabled();
  await page.getByRole('textbox').press('Enter');
  await expect(page.getByRole('textbox')).toHaveValue('A message written while loading.');
  release();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByText('A message written while loading.', { exact: true })).toBeVisible();
});
