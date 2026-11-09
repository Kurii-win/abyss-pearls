/**
 * Screenshots for the pitch docs (docs/screens/). Skipped unless SCREENSHOTS=1:
 *   SCREENSHOTS=1 npx playwright test screens
 */
import { expect, test } from '@playwright/test'

test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to refresh docs/screens/')
test.use({ viewport: { width: 1100, height: 900 } })

test('Play page mid-win', async ({ page }) => {
  await page.goto('/play?seed=11')
  await page.getByTestId('spin-button').click()
  await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'SHOWING_WINS', { timeout: 5_000 })
  await page.waitForTimeout(1_000)
  await page.getByTestId('slot').screenshot({ path: 'docs/screens/play-win.png' })
})

test('Play page big win', async ({ page }) => {
  await page.goto('/play?seed=669')
  await page.getByTestId('spin-button').click()
  await expect(page.getByTestId('big-win')).toBeVisible({ timeout: 5_000 })
  await page.waitForTimeout(1_800)
  await page.getByTestId('slot').screenshot({ path: 'docs/screens/play-big-win.png' })
})

test('Play page in free spins', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/play?seed=219')
  await page.getByTestId('spin-button').click()
  // Free spin 2 of seed 219 pays with multiplied wilds.
  await expect(page.getByTestId('free-spin-counter')).toHaveText('Free spin 2 / 8', { timeout: 20_000 })
  await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'SHOWING_WINS', { timeout: 10_000 })
  await page.waitForTimeout(1_000)
  await page.getByTestId('slot').screenshot({ path: 'docs/screens/play-free-spins.png' })
})

test.describe('portfolio pages (desktop)', () => {
  for (const [path, name] of [
    ['/', 'home'],
    ['/math', 'math'],
    ['/architecture', 'architecture'],
    ['/contact', 'contact'],
  ] as const) {
    test(`${name} page`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.screenshot({ path: `docs/screens/${name}.png`, fullPage: true })
    })
  }

  test('rules dialog', async ({ page }) => {
    await page.goto('/play')
    await page.getByTestId('rules-button').click()
    await expect(page.getByRole('dialog', { name: 'Rules & paytable' })).toBeVisible()
    await page.screenshot({ path: 'docs/screens/rules.png' })
  })
})

test.describe('portfolio pages (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  for (const [path, name] of [
    ['/', 'home'],
    ['/math', 'math'],
  ] as const) {
    test(`${name} page, mobile`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.screenshot({ path: `docs/screens/${name}-mobile.png`, fullPage: true })
    })
  }
})
