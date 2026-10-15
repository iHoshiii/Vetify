import { test, expect } from '@playwright/test';
import { installApi } from './api';
import { fitsViewport, noPageOverflow } from './assertions';
import { VET_ID } from './data';

test('call controls and chat remain usable in the available screen space', async ({
  context,
  page,
}) => {
  await installApi(context, 'user', true);
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
  const connected = page.waitForResponse(
    (response) =>
      response.url().includes('/socket.io') &&
      response.url().includes('sid=') &&
      response.request().method() === 'GET'
  );
  await page.goto('/');
  await connected;
  await expect(page.getByRole('button', { name: 'Account', exact: true })).toBeVisible();
  await page.evaluate((path) => {
    history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, `/call/${VET_ID}`);
  await expect(page.getByText('Dr Responsive', { exact: true }).first()).toBeVisible();
  const mic = page.getByRole('button', { name: 'Mute microphone', exact: true });
  await fitsViewport(page, mic);
  await mic.click();
  await expect(page.getByRole('button', { name: 'Unmute microphone', exact: true })).toBeVisible();
  await fitsViewport(page, page.getByRole('button', { name: 'Leave call', exact: true }));
  await page.getByRole('button', { name: 'Open chat', exact: true }).click();
  await fitsViewport(page, page.getByRole('complementary', { name: 'Call chat' }));
  await page.getByPlaceholder('Type a message', { exact: true }).fill('Responsive call chat');
  await fitsViewport(page, page.getByRole('button', { name: 'Send message', exact: true }));
  await page
    .getByRole('complementary', { name: 'Call chat' })
    .getByRole('button', { name: 'Close chat', exact: true })
    .click();
  await noPageOverflow(page);
});
