import { expect, test } from '@playwright/test';
import { installApi } from './api';
import { installMapResults } from './map-results-data';
import { mapContentFits } from './map-layout-assertions';

for (const state of ['denied', 'failed', 'unsupported', 'asking'] as const) {
  test(`map location feedback fits when ${state}`, async ({ context, page }) => {
    await installApi(context, 'user');
    await context.addInitScript((state) => {
      if (state === 'unsupported') {
        Reflect.deleteProperty(Object.getPrototypeOf(navigator), 'geolocation');
        Reflect.deleteProperty(navigator, 'geolocation');
      } else {
        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: {
            getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) => {
              if (state !== 'asking')
                failure({ code: state === 'denied' ? 1 : 2, PERMISSION_DENIED: 1 });
            },
          },
        });
      }
    }, state);
    await page.goto('/map');
    await page.getByRole('button', { name: 'Use my location', exact: true }).click();
    const message = {
      denied: 'Thanks for keeping your location private.',
      failed: 'We could not get a fix from this device.',
      unsupported: 'This browser cannot share a location.',
      asking: 'Locating',
    }[state];
    await expect(page.locator('main p').filter({ hasText: message })).toBeVisible();
    await mapContentFits(page);
  });
}

for (const state of ['empty', 'directory-failed', 'clinics-failed', 'both-failed'] as const) {
  test(`nearby results fit when ${state}`, async ({ context, page }) => {
    await installApi(context, 'user');
    await installMapResults(context, {
      near:
        state === 'empty'
          ? 'empty'
          : state === 'directory-failed' || state === 'both-failed'
          ? 'failed'
          : undefined,
      clinics:
        state === 'empty'
          ? 'empty'
          : state === 'clinics-failed' || state === 'both-failed'
          ? 'failed'
          : undefined,
    });
    await page.goto('/map');
    await page.getByRole('button', { name: 'Use my location', exact: true }).click();
    const message = {
      empty: 'Nothing is listed within',
      'directory-failed': 'so this list is only the clinics from the Map.',
      'clinics-failed': 'so this list is only Vetify',
      'both-failed': 'We could not reach the directory or OpenStreetMap.',
    }[state];
    await expect(page.locator('main p').filter({ hasText: message })).toBeVisible();
    await expect(page.locator('main li')).toHaveCount(
      state === 'directory-failed' ? 1 : state === 'clinics-failed' ? 4 : 0
    );
    await mapContentFits(page);
  });
}

test('location result loading stays contained until the results arrive', async ({
  context,
  page,
}) => {
  await installApi(context, 'user');
  await installMapResults(context);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await context.route('**/api/v1/professionals/near?**', async (route) => {
    await pending;
    await route.fallback();
  });
  try {
    await page.goto('/map');
    await page.getByRole('button', { name: 'Use my location', exact: true }).click();
    await expect(page.getByText(/Looking for vets near you/)).toBeVisible();
    await mapContentFits(page);
  } finally {
    release();
  }
  await expect(page.locator('main li')).toHaveCount(5);
  await mapContentFits(page);
});
