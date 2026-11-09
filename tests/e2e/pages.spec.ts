/**
 * M4 portfolio pages. Math figures are recomputed here from reports/rtp-report.json in
 * Node with plain toFixed / Math.round, so the page must show exactly the report.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

const report = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../reports/rtp-report.json'), 'utf8'),
)
const pct = (f: number) => `${(f * 100).toFixed(2)}%`
const oneIn = (n: number) => `1 in ${Math.round(n).toLocaleString('en-US')}`

const ROUTES = [
  { path: '/', h1: 'Abyss Pearls' },
  { path: '/play', h1: 'Abyss Pearls' },
  { path: '/math', h1: 'Math & Fairness' },
  { path: '/architecture', h1: 'Architecture' },
  { path: '/contact', h1: 'Contact' },
] as const

/** Collect console errors and uncaught page errors. */
function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

test.describe('every route', () => {
  for (const route of ROUTES) {
    test(`${route.path} loads cleanly with the right h1, nav and footer`, async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(route.path)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.h1)
      await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible()
      await expect(
        page.getByText('Demo — ✦ Pearls have no monetary value and cannot be purchased or redeemed.'),
      ).toBeVisible()
      const text = await page.locator('body').innerText()
      expect(text).not.toMatch(/Buffalo|Aristocrat/i)
      expect(errors).toEqual([])
    })

    test(`${route.path} has no horizontal scroll at 390 px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(route.path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('Math & Fairness', () => {
  test('headline, CI, hit frequency and trigger equal the report', async ({ page }) => {
    const h = report.rtp.headline
    await page.goto('/math')
    await expect(page.getByTestId('headline-rtp')).toHaveText(
      `Theoretical RTP ${pct(h.value)} (95% CI ${(h.ci95Low * 100).toFixed(2)}–${(h.ci95High * 100).toFixed(2)}%)`,
    )
    await expect(page.getByTestId('headline')).toContainText(h.method)
    await expect(page.getByTestId('stat-hit-frequency')).toContainText(pct(report.hitFrequency))
    await expect(page.getByTestId('stat-trigger')).toContainText(oneIn(report.featureTriggerOneInExact))
    await expect(page.getByTestId('repro-math-hash')).toContainText(report.math.mathHash)
    await expect(page.getByTestId('repro-code-hash')).toContainText(report.math.codeHash)
    await expect(page.getByText('Rounds settle at the moment Spin is pressed (server-style)')).toBeVisible()
  })

  test('win distribution chart has a data table with every bucket', async ({ page }) => {
    await page.goto('/math')
    const chart = page.getByTestId('chart-all')
    await expect(chart.locator('svg[role="img"]')).toBeVisible()
    await chart.getByText('Show the data as a table').click()
    for (const bucket of report.winDistribution) {
      await expect(chart.getByRole('rowheader', { name: bucket.label, exact: true })).toBeVisible()
    }
  })

  test('opens the rules dialog from the page', async ({ page }) => {
    await page.goto('/math')
    await page.getByRole('button', { name: 'Open the rules & paytable' }).click()
    await expect(page.getByRole('dialog', { name: 'Rules & paytable' })).toBeVisible()
  })
})

test.describe('Rules dialog on Play', () => {
  test('opens and closes with the keyboard, traps focus and shows the notices', async ({ page }) => {
    await page.goto('/play')
    const opener = page.getByTestId('rules-button')
    await opener.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Rules & paytable' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
    await expect(dialog.getByTestId('rules-notices')).toContainText(
      'Demo only: ✦ Pearls have no monetary value and cannot be purchased or redeemed.',
    )
    await expect(dialog.getByTestId('rules-notices')).toContainText('Malfunction voids all pays and plays.')
    await expect(dialog.getByTestId('rules-rtp')).toContainText(pct(report.rtp.headline.value))

    // Focus stays inside while tabbing around.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Shift+Tab')
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)

    // Space on non-interactive dialog content must not spin the reels behind it.
    await dialog.locator('h3').first().click()
    await page.keyboard.press('Space')
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE')
  })

  test('pays follow the selected bet', async ({ page }) => {
    await page.goto('/play')
    await page.getByTestId('bet-250').click()
    await page.getByTestId('rules-button').click()
    // Whale 5 of a kind: 500 coins per way × coin value 10.
    await expect(page.locator('tr[data-symbol="WHALE"]')).toContainText('✦ 5,000')
  })
})

test('Contact has placeholders and no form', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.locator('form')).toHaveCount(0)
  await expect(page.locator('input, textarea, select')).toHaveCount(0)
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
  await expect(page.getByTestId('contact-list').getByText('TODO: to be filled in').first()).toBeVisible()
})

test('Home shows the headline RTP from the report and a Play Demo CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('card-rtp')).toContainText(pct(report.rtp.headline.value))
  await page.getByRole('link', { name: 'Play Demo' }).click()
  await expect(page).toHaveURL(/\/play$/)
})
