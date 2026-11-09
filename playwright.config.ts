import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests against the dev server (localhost:5173). An already-running `npm run dev`
 * is reused locally (never started twice, never killed); CI always starts its own.
 * The production build is tested by playwright.prod.config.ts (`npm run e2e:prod`).
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Production-only checks (e.g. ?seed= being ignored) run in e2e:prod.
  testIgnore: ['**/prod.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
