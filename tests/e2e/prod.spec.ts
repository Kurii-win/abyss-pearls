/**
 * Production-build guarantees (run by `npm run e2e:prod` against `vite preview`).
 */
import { expect, test } from '@playwright/test'
import { createSeededRng } from '../../src/models/rng'
import { spin } from '../../src/models/spin'

test('?seed= has no effect in production: outcomes come from crypto RNG', async ({ page }) => {
  const seeded = spin(createSeededRng(11)).stops.join(',')
  const seen: string[] = []
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (let i = 0; i < 3; i++) {
    // A fresh page each time: in dev, ?seed=11 would make every first spin land on `seeded`.
    await page.goto('/play?seed=11')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE')
    await page.getByTestId('spin-button').click()
    // The bet is booked at the press; then the reels land and expose their stops again.
    await expect(page.getByTestId('balance')).not.toHaveAttribute('data-value', '10000')
    await expect(page.getByTestId('reels')).toHaveAttribute('data-stops', /\d/, { timeout: 5_000 })
    seen.push((await page.getByTestId('reels').getAttribute('data-stops'))!)
  }
  // Chance that crypto picks the seeded window even once is ~1 in 10^7; three times, never.
  expect(seen.filter((s) => s === seeded).length).toBeLessThan(3)
  expect(new Set(seen).size).toBeGreaterThan(1)
})

test('deep links survive a hard refresh', async ({ page }) => {
  for (const [path, h1] of [
    ['/math', 'Math & Fairness'],
    ['/architecture', 'Architecture'],
    ['/play', 'Abyss Pearls'],
  ] as const) {
    await page.goto(path)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1)
  }
})

test('pitch metadata and favicon are served', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Abyss Pearls/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /virtual ✦ Pearls/i)
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', '/og-image.png')
  for (const asset of ['/favicon.png', '/og-image.png']) {
    const res = await request.get(asset)
    expect(res.status(), asset).toBe(200)
    expect(res.headers()['content-type']).toContain('image/png')
  }
})
