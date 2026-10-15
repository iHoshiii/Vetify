import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport } from './assertions';

test('Home returns to the complete hero after scrolling down the same page', async ({
  context,
  page,
}) => {
  await installApi(context, 'user');
  await page.goto('/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'instant' })
  );
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  const nav = page.getByRole('navigation', {
    name: page.viewportSize()!.width >= 1280 ? 'Main navigation' : 'Quick navigation',
  });
  await nav.getByRole('link', { name: 'Home', exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const tagline = page.getByText('Everyday pet care', { exact: true });
  await fitsViewport(page, tagline);
  expect((await tagline.boundingBox())!.y).toBeGreaterThanOrEqual(
    (await page.locator('header').first().boundingBox())!.height
  );
});
