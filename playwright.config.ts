import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  /* Fail CI build on test.only left in source */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests on CI */
  retries: process.env.CI ? 2 : 0,
  /* Single worker on CI to avoid resource contention */
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  /* Start Next.js dev server before running tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
