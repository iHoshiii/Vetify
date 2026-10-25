import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const pages: { path: string; title: string; description: string }[] = JSON.parse(
  readFileSync(new URL('../../src/shared/public-pages.json', import.meta.url), 'utf8')
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('vetify-testing-notice-acknowledged', 'true');
  });
});

test.describe('public content without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all sitemap pages contain readable content and their own search metadata', async ({
    page,
  }) => {
    for (const entry of pages) {
      const response = await page.goto(entry.path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(entry.title);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://vetify.page${entry.path}`
      );
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        entry.description
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    }
  });
});

test('public navigation updates metadata and application pages have no public canonical', async ({
  page,
}) => {
  await page.goto('/help');
  await page.getByRole('link', { name: 'Back to Home' }).click();
  await expect(page).toHaveURL('/');
  await expect(page).toHaveTitle(pages[0].title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://vetify.page/'
  );
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveTitle(pages[0].title);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
});
