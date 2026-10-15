import { expect, test } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';

test('professional introduction keeps its action close to the text', async ({ context, page }) => {
  await installApi(context, 'guest');
  await page.goto('/professionals');
  const heading = page.getByRole('heading', { level: 1 });
  const apply = page.getByRole('button', { name: 'Apply to join' });
  await expect(heading).toBeVisible();
  if (page.viewportSize()!.width < 1280) {
    const hero = await page.locator('main > section').boundingBox();
    const title = await heading.boundingBox();
    const action = await apply.boundingBox();
    expect(title!.y - hero!.y).toBeLessThanOrEqual(40);
    expect(hero!.y + hero!.height - action!.y - action!.height).toBeLessThanOrEqual(40);
  }
  await apply.scrollIntoViewIfNeeded();
  await fitsViewport(page, apply);
  await apply.click();
  const dialog = page.getByRole('dialog', { name: 'Eligibility Requirements' });
  await fitsViewport(page, dialog);
  await dialog.getByRole('button', { name: 'Go back' }).click();
  await expect(dialog).toHaveCount(0);
  await noPageOverflow(page);
});

for (const path of ['/login', '/signup', '/forgot-password']) {
  test(`short account page starts below navigation on ${path}`, async ({ context, page }) => {
    await installApi(context, 'guest');
    await page.goto(path);
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    if (page.viewportSize()!.width < 1280) {
      const header = await page.locator('header').first().boundingBox();
      const title = await heading.boundingBox();
      expect(title!.y - header!.y - header!.height).toBeGreaterThanOrEqual(0);
      await expect
        .poll(async () => {
          const settledHeader = await page.locator('header').first().boundingBox();
          const settledTitle = await heading.boundingBox();
          return settledTitle!.y - settledHeader!.y - settledHeader!.height;
        })
        .toBeLessThanOrEqual(64);
    }
    await noPageOverflow(page);
  });
}
