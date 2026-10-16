import { expect, test } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';

for (const role of ['guest', 'user'] as const) {
  test(`mobile menu preserves the scrolled page for ${role}`, async ({ context, page }) => {
    test.skip(page.viewportSize()!.width >= 1280, 'Desktop uses the full navigation.');
    await installApi(context, role);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.locator('#about').evaluate((section) => section.scrollIntoView({ block: 'start' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
    const scrollY = await page.evaluate(() => window.scrollY);
    const toggle = page.getByRole('button', { name: 'Toggle menu' });
    const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
    const header = page.locator('header').first();

    for (const close of ['Escape', 'toggle']) {
      await toggle.click();
      await expect(menu).toBeVisible();
      await fitsViewport(page, toggle);
      await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
      await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
      await menu.getByRole('link').last().scrollIntoViewIfNeeded();
      await fitsViewport(page, menu.getByRole('link').last());
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
      if (close === 'Escape') await page.keyboard.press('Escape');
      else await toggle.click();
      await expect(menu).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
      await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);
    }

    await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollY);
    await noPageOverflow(page);
  });
}
