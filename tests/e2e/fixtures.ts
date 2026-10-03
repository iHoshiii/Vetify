import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    const unexpected: string[] = [];
    const pageErrors: string[] = [];
    page.on('pageerror', (cause) => pageErrors.push(cause.message));
    await page.route('**/api/v1/**', async (route) => {
      unexpected.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      await route.abort();
    });
    await use(page);
    expect(unexpected, 'Every API call must use a controlled test reply').toEqual([]);
    expect(pageErrors, 'Browser pages must not crash').toEqual([]);
  },
});

export { expect };
