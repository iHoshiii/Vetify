import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';

test('home copy has no animation delay when reduced motion is enabled', async ({
  context,
  page,
}, testInfo) => {
  await installApi(context, 'user');
  await page.goto('/#home');
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveCSS('animation-delay', '0s');
  await expect(title).toHaveCSS('opacity', '1');
  await fitsViewport(page, title);
  await noPageOverflow(page);
  await page.evaluate(() =>
    Promise.all([...document.images].map((image) => image.decode().catch(() => {})))
  );
  await page.screenshot({
    path: `node_modules/.cache/home-motion-${testInfo.project.name}.png`,
    animations: 'disabled',
  });
});
