import { defineConfig, devices } from '@playwright/test'

/**
 * The smoke suite against the PRODUCTION build: `npm run e2e:prod` builds the app and
 * serves dist/ with `vite preview` on port 4173 (dev keeps 5173, so both can run at
 * once). Specs that rely on the dev-only `?seed=` RNG (play.spec, screens.spec) are
 * left out; prod.spec checks that `?seed=` has no effect here.
 */
const PORT = 4173

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['home.spec.ts', 'pages.spec.ts', 'network.spec.ts', 'mobile.spec.ts', 'prod.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium-prod', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Always a fresh build: a stale preview server must never be tested by mistake.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
