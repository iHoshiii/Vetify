import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';
import { VET_ID } from './data';

test('a directly opened call waits for account refresh and keeps its controls visible', async ({
  context,
  page,
}) => {
  await installApi(context, 'user', true);
  await context.route('**/api/v1/auth/refresh', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fallback();
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () =>
          typeof MediaStream === 'function'
            ? new MediaStream()
            : { getTracks: () => [], getVideoTracks: () => [], getAudioTracks: () => [] },
      },
      configurable: true,
    });
    if (typeof MediaStream !== 'function')
      Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
        get: () => null,
        set: () => {},
        configurable: true,
      });
  });
  await page.goto(`/call/${VET_ID}`);
  await expect(page.getByText('Dr Responsive', { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/call/${VET_ID}$`));
  await fitsViewport(page, page.getByRole('button', { name: 'Mute microphone', exact: true }));
  await fitsViewport(page, page.getByRole('button', { name: 'Leave call', exact: true }));
  await noPageOverflow(page);
});
