import { defineConfig } from '@playwright/test';

const sizes = [
  ['phone-small', 320, 568],
  ['phone', 390, 844],
  ['phone-landscape', 568, 320],
  ['tablet', 768, 1024],
  ['ipad', 820, 1180],
  ['ipad-landscape', 1024, 768],
  ['laptop', 1280, 800],
  ['desktop', 1440, 900],
  ['wide', 1920, 1080],
] as const;
export default defineConfig({
  testDir: './tests/responsive',
  fullyParallel: true,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8000 },
  reporter: [['list'], ['json', { outputFile: 'node_modules/.cache/responsive-report.json' }]],
  outputDir: 'test-results/responsive',
  use: {
    baseURL: 'http://127.0.0.1:4197',
    contextOptions: { reducedMotion: 'reduce' },
    colorScheme: 'light',
    locale: 'en-PH',
    timezoneId: 'Asia/Manila',
    geolocation: { latitude: 16.481, longitude: 121.149 },
    permissions: ['geolocation'],
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    ...sizes.map(([name, width, height]) => ({
      name: `chromium-${name}`,
      use: {
        browserName: 'chromium' as const,
        viewport: { width, height },
        hasTouch: width < 1280,
      },
    })),
    ...sizes
      .filter(([name]) => ['phone', 'ipad', 'phone-landscape', 'laptop'].includes(name))
      .map(([name, width, height]) => ({
        name: `webkit-${name}`,
        use: {
          browserName: 'webkit' as const,
          viewport: { width, height },
          hasTouch: width < 1280,
          isMobile: width < 1280,
        },
      })),
    ...sizes
      .filter(([name]) => ['phone', 'tablet', 'laptop'].includes(name))
      .map(([name, width, height]) => ({
        name: `firefox-${name}`,
        use: {
          browserName: 'firefox' as const,
          viewport: { width, height },
          hasTouch: width < 1280,
        },
      })),
  ],
  webServer: {
    command: 'node scripts/serve-responsive-preview.mjs',
    url: 'http://127.0.0.1:4197',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
