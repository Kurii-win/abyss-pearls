/**
 * M5 presentation polish on the dev server (uses the dev-only `?seed=` RNG): scatter
 * anticipation, big-win celebration and skip, bet-lock hint, win label totals and the
 * two-tab wallet sync. None of it may change an outcome, so each test also checks the
 * landed result against the model computed here in Node.
 */
import { expect, test, type Page } from '@playwright/test'
import { createSeededRng } from '../../src/models/rng'
import { spin } from '../../src/models/spin'

const expected = (seed: number) => spin(createSeededRng(seed))
const value = async (page: Page, testId: string) => Number(await page.getByTestId(testId).getAttribute('data-value'))
const fmt = (n: number) => n.toLocaleString('en-US')

/** First spin: chests on reels 1–3, reels 4–5 tease; no trigger. */
const TEASE_SEED = 12
const BIG_WIN_SEED = 669
const FEATURE_SEED = 219
const BASE_WIN_SEED = 11

test('anticipation: reels after two chests glow and stop later, on the decided stops', async ({ page }) => {
  const result = expected(TEASE_SEED)
  await page.goto(`/play?seed=${TEASE_SEED}`)
  await page.getByTestId('spin-button').click()
  const teasing = page.locator('.reel[data-anticipating]')
  await expect(teasing).toHaveCount(2, { timeout: 3_000 })
  await expect(teasing).toHaveCount(1, { timeout: 3_000 })
  await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE', { timeout: 5_000 })
  await expect(teasing).toHaveCount(0)
  await expect(page.getByTestId('reels')).toHaveAttribute('data-stops', result.stops.join(','))
  expect(await value(page, 'balance')).toBe(10_000 - 25 + result.totalCoins)
})

test('no anticipation after a slam stop', async ({ page }) => {
  await page.goto(`/play?seed=${TEASE_SEED}`)
  await page.keyboard.press('Space')
  await page.keyboard.press('Space')
  await expect(page.getByTestId('reels')).toHaveAttribute('data-stops', expected(TEASE_SEED).stops.join(','), { timeout: 400 })
  await expect(page.locator('.reel[data-anticipating]')).toHaveCount(0)
})

test('big win: reels dim, pearls burst, a tap skips the celebration', async ({ page }) => {
  const result = expected(BIG_WIN_SEED)
  await page.goto(`/play?seed=${BIG_WIN_SEED}`)
  await page.getByTestId('spin-button').click()
  const big = page.getByTestId('big-win')
  await expect(big).toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('reels')).toHaveClass(/reel-frame--dimmed/)
  await expect(page.getByTestId('pearl-burst')).toBeAttached()
  await big.click()
  await expect(big).toBeHidden()
  await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE')
  await expect(page.getByTestId('reels')).not.toHaveClass(/reel-frame--dimmed/)
  expect(await value(page, 'balance')).toBe(10_000 - 25 + result.totalCoins)
})

test('big win: Space skips the celebration without spinning again', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/play?seed=${BIG_WIN_SEED}`)
  await page.keyboard.press('Space')
  await expect(page.getByTestId('big-win')).toBeVisible({ timeout: 5_000 })
  // Reduced motion: no particles.
  await expect(page.getByTestId('pearl-burst')).toHaveCount(0)
  await page.keyboard.press('Space')
  await expect(page.getByTestId('big-win')).toBeHidden()
  await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE')
  await expect(page.getByText('Session history (1)')).toBeVisible()
})

test('bet chips explain why they are locked during free spins', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/play?seed=${FEATURE_SEED}`)
  await expect(page.getByTestId('bet-lock-hint')).toHaveCount(0)
  await page.getByTestId('spin-button').click()
  await expect(page.getByTestId('feature-intro')).toBeVisible({ timeout: 5_000 })
  const hint = page.getByTestId('bet-lock-hint')
  await expect(hint).toBeVisible()
  await expect(hint).toContainText('locked during free spins')
  await expect(page.getByTestId('bet-50')).toBeDisabled()
  await page.getByRole('button', { name: 'Skip to total' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(hint).toHaveCount(0)
  await expect(page.getByTestId('bet-50')).toBeEnabled()
})

test('the all-wins label shows the spin total', async ({ page }) => {
  // Find a seed whose first spin has 2+ wins on the reels and no feature.
  let seed = 0
  for (; seed < 500; seed++) {
    const r = expected(seed)
    if (!r.feature && r.wayWins.length + (r.scatterWin ? 1 : 0) >= 2 && r.baseCoins < 20 * 25) break
  }
  const r = expected(seed)
  const wins = r.wayWins.length + (r.scatterWin ? 1 : 0)
  await page.goto(`/play?seed=${seed}`)
  await page.getByTestId('spin-button').click()
  await expect(page.getByTestId('win-label')).toHaveText(`${wins} wins · ${fmt(r.baseCoins)} ✦`, { timeout: 5_000 })
})

test('two tabs share one wallet: the idle tab picks up the other tab’s spin', async ({ context }) => {
  const a = await context.newPage()
  const b = await context.newPage()
  await a.emulateMedia({ reducedMotion: 'reduce' })
  await a.goto(`/play?seed=${BASE_WIN_SEED}`)
  await b.goto('/play')
  await expect(b.getByTestId('balance')).toHaveAttribute('data-value', '10000')

  await a.getByTestId('spin-button').click()
  await expect(a.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE', { timeout: 5_000 })
  const balance = 10_000 - 25 + expected(BASE_WIN_SEED).totalCoins
  expect(await value(a, 'balance')).toBe(balance)

  await expect(b.getByTestId('balance')).toHaveAttribute('data-value', String(balance))
  await expect(b.getByTestId('tab-sync-notice')).toBeVisible()
  await expect(b.getByText('Session history (1)')).toBeVisible()
})
