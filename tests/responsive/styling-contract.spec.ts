import { test, expect } from '@playwright/test';
import { installApi, type Role } from './api';
import { routes } from './routes';
import { tightLayout } from './styling-assertions';

for (const [role, paths] of Object.entries(routes)) {
  for (const path of paths) {
    test(`${role} styling fits ${path}`, async ({ context, page }) => {
      const unknown = await installApi(context, role as Role);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(path);
      await page.locator('h1:visible,h2:visible,[role=alert]:visible').first().waitFor();
      await page.waitForLoadState('networkidle');
      await tightLayout(page);
      expect(errors).toEqual([]);
      expect([...unknown]).toEqual([]);
    });
  }
}

test('home photo stays complete in the background layer', async ({ context, page }, testInfo) => {
  await installApi(context, 'user');
  await page.goto('/#home');
  await page.waitForLoadState('networkidle');
  if (page.viewportSize()!.width < 1280) {
    const photo = await page.locator('#home').evaluate((hero) => {
      const backdrop = hero.querySelector('.home-hero-backdrop')!;
      const content = hero.querySelector('.home-hero-content')!;
      const image = hero.querySelector('img')!;
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;width:1px;height:var(--hero-photo-height)';
      hero.append(probe);
      const height = probe.getBoundingClientRect().height;
      probe.remove();
      return {
        height,
        width: height * (image.naturalWidth / image.naturalHeight),
        hero: hero.getBoundingClientRect().toJSON(),
        size: getComputedStyle(backdrop).backgroundSize,
        position: getComputedStyle(backdrop).position,
        visible: getComputedStyle(backdrop).display,
        contentZ: getComputedStyle(content).zIndex,
        duplicate: getComputedStyle(image).display,
        ctaBottom: hero.querySelector('.hero-cta')!.getBoundingClientRect().bottom,
      };
    });
    expect(photo.visible).not.toBe('none');
    expect(photo.position).toBe('absolute');
    expect(photo.contentZ).toBe('10');
    expect(photo.duplicate).toBe('none');
    expect(photo.size).toContain('auto');
    expect(photo.width).toBeGreaterThan(0);
    expect(photo.height).toBeGreaterThan(0);
    expect(photo.width).toBeLessThanOrEqual(photo.hero.width + 1);
    expect(photo.height).toBeLessThanOrEqual(photo.hero.height + 1);
    expect(photo.height).toBeLessThan(page.viewportSize()!.height);
    expect(photo.ctaBottom).toBeGreaterThan(photo.hero.bottom - photo.height);
  }
  await tightLayout(page);
  await page.screenshot({
    path: `node_modules/.cache/style-home-${testInfo.project.name}.png`,
    animations: 'disabled',
  });
});
