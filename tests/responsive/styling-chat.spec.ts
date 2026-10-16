import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport } from './assertions';
import { tightLayout } from './styling-assertions';

test('AI chat input, history and model choices remain usable', async ({ context, page }) => {
  await installApi(context, 'user');
  await page.goto('/chat');
  await page.getByRole('button', { name: 'Gemini 3.5 Flash', exact: true }).click();
  await tightLayout(page);
  await page.getByRole('button', { name: 'Gemini 2.5 Flash', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gemini 2.5 Flash', exact: true })).toBeVisible();
  const composer = page.getByRole('textbox');
  await composer.fill('Is my dog okay?');
  const send = page.getByRole('button', { name: 'Send message', exact: true });
  await send.scrollIntoViewIfNeeded();
  await fitsViewport(page, send);
  await tightLayout(page);
  await send.click();
  const reply = page.getByText('Please contact a veterinarian if symptoms persist.', {
    exact: true,
  });
  await expect(reply).toBeVisible();
  await tightLayout(page);
  await page.getByRole('button', { name: 'New Chat', exact: true }).click();
  await expect(reply).toHaveCount(0);
  await page.locator('aside [role="button"]').first().click();
  await expect(reply).toBeVisible();
  await tightLayout(page);
});

test('expanded message dates wrap without leaving the viewport', async ({ context, page }) => {
  await installApi(context, 'user');
  await page.goto('/messages');
  await page
    .getByRole('button', { name: /Dr Alexandra Responsive/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Show message date and time', exact: true })
    .first()
    .click();
  const meta = page.getByTestId('message-meta').first();
  await meta.scrollIntoViewIfNeeded();
  const box = await meta.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await tightLayout(page);
});
