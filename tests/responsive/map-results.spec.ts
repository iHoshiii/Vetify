import { expect, test } from '@playwright/test';
import { installApi } from './api';
import { installMapResults, mapPerson } from './map-results-data';
import { mapContentFits } from './map-layout-assertions';
import { VET_ID } from './data';

for (const long of [false, true]) {
  test(`populated nearby results fit with ${
    long ? 'unbroken names and large text' : 'all booking statuses'
  }`, async ({ context, page }, testInfo) => {
    await installApi(context, 'user');
    await installMapResults(context, { long });
    await page.goto('/map');
    if (long) await page.addStyleTag({ content: 'html { font-size: 20px; }' });
    await page.getByRole('button', { name: 'Use my location', exact: true }).click();
    await expect(page.locator('main li')).toHaveCount(5);
    await mapContentFits(page);
    await expect(page.getByText('Taking bookings', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Booked up', { exact: true })).toBeVisible();
    await expect(page.getByText('Not taking bookings', { exact: true })).toBeVisible();
    const online = page.getByRole('link', { name: /^Online Consultation with/ });
    await expect(online).toHaveAttribute('href', `/book-appointment?professional=${VET_ID}`);
    await expect(page.getByRole('link', { name: 'Open in Maps', exact: true })).toHaveAttribute(
      'target',
      '_blank'
    );
    await page.screenshot({
      path: `node_modules/.cache/map-results-${long}-${testInfo.project.name}.png`,
      fullPage: true,
    });
    if (!long) {
      await online.click();
      await expect(page).toHaveURL(new RegExp(`/book-appointment\\?professional=${VET_ID}$`));
      await page.goBack();
      await expect(page).toHaveURL(/\/map$/);
      await page.getByRole('button', { name: /^(Use my location|Update)$/ }).click();
      await page.getByRole('link', { name: `${mapPerson}, profile`, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/professionals/${VET_ID}$`));
    }
  });
}
