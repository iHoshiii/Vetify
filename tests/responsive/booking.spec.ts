import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { appointment } from './data-appointment';
import { pageOf } from './data';
import { fitsViewport, noPageOverflow } from './assertions';

test('existing bookings and a new request preview fit without losing form controls', async ({
  context,
  page,
}) => {
  await installApi(context, 'user');
  await context.route('**/api/v1/appointments/mine**', (route) =>
    route.fulfill({ json: pageOf(appointment) })
  );
  await page.goto('/book-appointment');
  await page.getByRole('button', { name: 'Your appointments', exact: true }).click();
  const bookings = page.getByRole('dialog', { name: 'Your appointments', exact: true });
  await expect(bookings.getByText(/Milo/).first()).toBeVisible();
  await fitsViewport(page, bookings);
  await noPageOverflow(page);
  await bookings.getByRole('button', { name: 'Close appointments', exact: true }).click();
  await page.getByRole('button', { name: 'Book', exact: true }).first().click();
  await page.getByRole('button', { name: /Online consultation/ }).click();
  await page
    .getByRole('button', { name: /^\d{1,2}:\d{2}/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Choose time', exact: true }).click();
  await page.getByLabel(/^Species/).fill('Dog');
  await page.getByLabel('Pet name (optional)', { exact: true }).fill('Milo');
  await page
    .getByLabel(/What is it about/)
    .fill('My dog needs advice about an itchy patch on his back.');
  await page.getByLabel(/^Phone/).fill('9123456789');
  await noPageOverflow(page);
  const request = page.getByRole('button', { name: 'Request this appointment', exact: true });
  await request.scrollIntoViewIfNeeded();
  await fitsViewport(page, request);
  await request.click();
  const preview = page.getByRole('dialog');
  await fitsViewport(page, preview);
  const confirm = preview.getByRole('button', { name: 'Confirm request', exact: true });
  await confirm.scrollIntoViewIfNeeded();
  await fitsViewport(page, confirm);
  await noPageOverflow(page);
  await preview.getByRole('button', { name: 'Go back', exact: true }).click();
});
