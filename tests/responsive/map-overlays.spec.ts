import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { installApi } from './api';
import { installMapResults, mapUnavailableId } from './map-results-data';
import { fitsViewport, noPageOverflow } from './assertions';

async function openResultsMap(context: BrowserContext, page: Page) {
  await installApi(context, 'user');
  await installMapResults(context, { long: true, clinics: 'failed' });
  await context.setGeolocation({ latitude: 16.477, longitude: 121.14 });
  await page.goto('/map');
  await page.addStyleTag({ content: 'html { font-size: 20px; }' });
  await page.getByRole('button', { name: 'Use my location', exact: true }).click();
  await expect(page.locator('main li')).toHaveCount(4);
  await page
    .getByRole('button', { name: /^(Open the map|Explore the interactive vet map)$/ })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Map of nearby vets and clinics' });
  await expect(dialog.locator('.leaflet-marker-icon')).toHaveCount(4);
  let previous = '';
  let stable = 0;
  await expect
    .poll(
      async () => {
        const position = await dialog.locator('.leaflet-map-pane').getAttribute('style');
        stable = position === previous ? stable + 1 : 0;
        previous = position || '';
        return stable;
      },
      { timeout: 15000, intervals: [300, 400, 500] }
    )
    .toBeGreaterThanOrEqual(3);
  return dialog;
}

test('map counts and partial-failure notice do not overlap with large text', async ({
  context,
  page,
}) => {
  const dialog = await openResultsMap(context, page);
  const count = dialog.getByText('4 on Vetify', { exact: true }).locator('..');
  const warning = dialog.getByText("Couldn't load nearby clinics", { exact: true });
  await fitsViewport(page, count);
  await fitsViewport(page, warning);
  const a = (await count.boundingBox())!;
  const b = (await warning.boundingBox())!;
  expect(
    a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y,
    'Map badges must not cover each other'
  ).toBe(true);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await noPageOverflow(page);
});

test('long map popup stays inside the screen and keeps profile control reachable', async ({
  context,
  page,
}) => {
  const dialog = await openResultsMap(context, page);
  await dialog.locator('.leaflet-marker-icon').nth(3).click();
  const popup = dialog.locator('.leaflet-popup');
  await expect(popup).toBeVisible();
  await expect
    .poll(async () => {
      const box = (await popup.boundingBox())!;
      const canvas = (await dialog.locator('.leaflet-container').boundingBox())!;
      return (
        box.x >= canvas.x &&
        box.y >= canvas.y &&
        box.x + box.width <= canvas.x + canvas.width + 1 &&
        box.y + box.height <= canvas.y + canvas.height + 1
      );
    })
    .toBe(true);
  const popupBox = (await popup.boundingBox())!;
  const closeBox = (await dialog
    .getByRole('button', { name: 'Close', exact: true })
    .boundingBox())!;
  expect(
    popupBox.x + popupBox.width <= closeBox.x ||
      closeBox.x + closeBox.width <= popupBox.x ||
      popupBox.y + popupBox.height <= closeBox.y ||
      closeBox.y + closeBox.height <= popupBox.y,
    'Map Close must not cover popup content'
  ).toBe(true);
  const content = popup.locator('.leaflet-popup-content');
  expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true
  );
  const profile = popup.getByRole('link', { name: 'Profile', exact: true });
  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await fitsViewport(page, profile);
  await expect(profile).toHaveAttribute('href', `/professionals/${mapUnavailableId}`);
  await popup.locator('.leaflet-popup-close-button').click();
  await expect(popup).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
