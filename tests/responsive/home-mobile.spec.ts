import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';

test.use({ contextOptions: { reducedMotion: 'no-preference' } });

for (const width of [220, 320, 360, 390, 430, 768]) {
  for (const role of ['guest', 'user'] as const) {
    test(`home navigation and copy remain visible at ${width}px for ${role}`, async ({
      context,
      page,
      browserName,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await installApi(context, role);
      await page.goto('/#home');
      const header = page.locator('header').first();
      const quick = page.getByRole('navigation', { name: 'Quick navigation' });
      await fitsViewport(page, header);
      for (const link of await quick.getByRole('link').all()) await fitsViewport(page, link);
      const toggle = page.getByRole('button', { name: 'Toggle menu' });
      await fitsViewport(page, toggle);
      await expect(toggle).toHaveText('Menu');
      const title = page.getByRole('heading', { level: 1 });
      const tagline = page.getByText('Everyday pet care', { exact: true });
      await fitsViewport(page, tagline);
      await expect
        .poll(async () => (await tagline.boundingBox())!.y)
        .toBeGreaterThanOrEqual((await header.boundingBox())!.height);
      await fitsViewport(page, title);
      await expect
        .poll(async () => (await title.boundingBox())!.y)
        .toBeGreaterThanOrEqual((await header.boundingBox())!.height - 1);
      await fitsViewport(page, page.getByRole('link', { name: 'Ask AI', exact: true }));
      await noPageOverflow(page);
      await toggle.click();
      const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
      const finalLink = menu.getByRole('link', {
        name: role === 'guest' ? 'Sign up' : 'Book Appointment',
        exact: true,
      });
      await finalLink.scrollIntoViewIfNeeded();
      await fitsViewport(page, finalLink);
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      if (role === 'user') {
        for (const [button, panel] of [
          ['Notifications', 'Notifications panel'],
          ['Messages', 'Messages panel'],
          ['Account', 'Account menu'],
        ]) {
          await page.getByRole('button', { name: button, exact: true }).click();
          const region = page.getByRole('region', { name: panel });
          await fitsViewport(page, region);
          expect((await region.boundingBox())!.y).toBeGreaterThanOrEqual(
            (await header.boundingBox())!.height
          );
          await page.getByRole('button', { name: button, exact: true }).click();
        }
      }
      await page.evaluate(() =>
        Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
      );
      await page.screenshot({
        path: `node_modules/.cache/home-${browserName}-${role}-${width}.png`,
      });
      await page.locator('#features').scrollIntoViewIfNeeded();
      await expect(page.locator('#features .reveal').first()).toHaveClass(/is-visible/);
      const clipped = await page
        .locator('main h1, main h2, main p')
        .evaluateAll((elements) =>
          elements.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent)
        );
      expect(clipped).toEqual([]);
      await noPageOverflow(page);
      await quick.getByRole('link', { name: 'Services', exact: true }).click();
      await expect(page).toHaveURL(/\/services$/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
}
