import { test, expect } from '@playwright/test';
import { installApi, type Role } from './api';
import { routes } from './routes';

for (const [role, paths] of Object.entries(routes)) {
  test.describe(role, () => {
    for (const path of paths) {
      test(`layout ${path}`, async ({ context, page }) => {
        const unknown = await installApi(context, role as Role);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(path);
        await page.locator('h1:visible,h2:visible,[role=alert]:visible').first().waitFor();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Something went wrong', { exact: true })).toHaveCount(0);
        const dimensions = await page.evaluate(() => ({
          width: innerWidth,
          document: document.documentElement.scrollWidth,
          overflow: [...document.querySelectorAll('body *')]
            .filter((item) => {
              const box = item.getBoundingClientRect();
              return (
                box.width &&
                box.right > innerWidth + 2 &&
                getComputedStyle(item).visibility !== 'hidden'
              );
            })
            .slice(0, 5)
            .map((item) => `${item.tagName} ${item.className}`),
        }));
        expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(
          dimensions.width + 1
        );
        expect(errors).toEqual([]);
        expect(
          [...unknown],
          'All API responses must be controlled and shaped for the page'
        ).toEqual([]);
      });
    }
  });
}
