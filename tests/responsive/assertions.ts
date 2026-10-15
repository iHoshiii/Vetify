import { expect, type Locator, type Page } from '@playwright/test';

export async function fitsViewport(page: Page, panel: Locator) {
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

export async function noPageOverflow(page: Page) {
  const size = await page.evaluate(() => ({
    actual: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  expect(size.actual).toBeLessThanOrEqual(size.width + 1);
}
