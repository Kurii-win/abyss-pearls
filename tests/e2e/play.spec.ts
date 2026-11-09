/**
 * M3 smoke tests for the Play page. They use the dev-only `?seed=N` RNG, and compute
 * the expected outcome with the same pure model in Node, so every number is exact.
 */
import { expect, test, type Page } from '@playwright/test'
import { createSeededRng } from '../../src/models/rng'
import { spin } from '../../src/models/spin'

/** Seed whose first spin is a plain base win (no feature). */
const BASE_WIN_SEED = 11
/** Seed whose first spin triggers free spins. */
const FEATURE_SEED = 219

const expected = (seed: number) => spin(createSeededRng(seed))
const value = async (page: Page, testId: string) => Number(await page.getByTestId(testId).getAttribute('data-value'))
const fmt = (n: number) => n.toLocaleString('en-US')

test.describe('Play page', () => {
  test('spin: reels stop on the model result and balance changes by win − bet', async ({ page }) => {
    const result = expected(BASE_WIN_SEED)
    expect(result.feature).toBeNull()
    expect(result.totalCoins).toBeGreaterThan(0)

    await page.goto(`/play?seed=${BASE_WIN_SEED}`)
    const slot = page.getByTestId('slot')
    await expect(slot).toHaveAttribute('data-phase', 'IDLE')
    const before = await value(page, 'balance')
    expect(before).toBe(10_000)

    await page.getByTestId('spin-button').click()
    await expect(page.getByTestId('reels')).not.toHaveAttribute('data-stops', /.*/)
    await expect(slot).toHaveAttribute('data-phase', 'SHOWING_WINS', { timeout: 5_000 })
    await expect(page.getByTestId('reels')).toHaveAttribute('data-stops', result.stops.join(','))
    await expect(slot).toHaveAttribute('data-phase', 'IDLE', { timeout: 5_000 })

    const win = await value(page, 'win')
    expect(win).toBe(result.totalCoins)
    expect(await value(page, 'balance')).toBe(before - 25 + win)
    await expect(page.getByTestId('balance')).toHaveText(`✦ ${fmt(before - 25 + win)}`)
    await expect(page.getByTestId('win')).toHaveText(`✦ ${fmt(win)}`)
    await expect(page.getByTestId('announcer')).toHaveText(`You won ${fmt(win)} Pearls.`)
  })

  test('slam stop (second Space press) lands immediately on the same result', async ({ page }) => {
    const result = expected(BASE_WIN_SEED)
    await page.goto(`/play?seed=${BASE_WIN_SEED}`)
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE')

    await page.keyboard.press('Space')
    await expect(page.getByTestId('spin-button')).toHaveAttribute('data-mode', 'stop')
    await page.keyboard.press('Space')
    // A natural stop takes > 1.5 s; the slam lands all reels well before that.
    await expect(page.getByTestId('reels')).toHaveAttribute('data-stops', result.stops.join(','), { timeout: 400 })
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE', { timeout: 5_000 })
    expect(await value(page, 'balance')).toBe(10_000 - 25 + result.totalCoins)
  })

  test('bet level scales the bet and the win', async ({ page }) => {
    const result = expected(BASE_WIN_SEED)
    await page.goto(`/play?seed=${BASE_WIN_SEED}`)
    await page.getByTestId('bet-250').click()
    await expect(page.getByTestId('bet')).toHaveAttribute('data-value', '250')
    await page.getByTestId('spin-button').click()
    await page.getByTestId('spin-button').click()
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE', { timeout: 5_000 })
    expect(await value(page, 'win')).toBe(result.totalCoins * 10)
    expect(await value(page, 'balance')).toBe(10_000 - 250 + result.totalCoins * 10)
  })

  test('free spins auto-play and return to IDLE with the correct total', async ({ page }) => {
    const result = expected(FEATURE_SEED)
    expect(result.feature).not.toBeNull()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/play?seed=${FEATURE_SEED}`)
    await page.getByTestId('spin-button').click()

    await expect(page.getByTestId('feature-intro')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('free-spins-banner')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('reels')).toHaveAttribute('data-mode', 'free')
    await expect(page.getByTestId('free-spin-counter')).toHaveText(`Free spin 1 / ${result.feature!.initialSpins}`)

    const outro = page.getByTestId('feature-outro')
    await expect(outro).toBeVisible({ timeout: 30_000 })
    await expect(outro).toHaveAttribute('data-total', String(result.totalCoins))
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE', { timeout: 5_000 })
    expect(await value(page, 'win')).toBe(result.totalCoins)
    expect(await value(page, 'balance')).toBe(10_000 - 25 + result.totalCoins)
    await expect(page.getByTestId('balance')).toHaveText(`✦ ${fmt(10_000 - 25 + result.totalCoins)}`)
  })

  test('Skip jumps to the feature total', async ({ page }) => {
    const result = expected(FEATURE_SEED)
    await page.goto(`/play?seed=${FEATURE_SEED}`)
    await page.getByTestId('spin-button').click()
    await expect(page.getByTestId('feature-intro')).toBeVisible({ timeout: 6_000 })
    await page.getByRole('button', { name: 'Skip to total' }).click()
    await expect(page.getByTestId('feature-outro')).toHaveAttribute('data-total', String(result.totalCoins))
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE')
    expect(await value(page, 'balance')).toBe(10_000 - 25 + result.totalCoins)
  })

  test('wallet UI: free Pearls disabled at 10,000, demo notice shown, no payment UI', async ({ page }) => {
    await page.goto('/play')
    await expect(page.getByRole('button', { name: /Get Free Pearls/ })).toBeDisabled()
    await expect(page.getByText('Demo — ✦ Pearls have no monetary value')).toBeVisible()
    await expect(page.getByText(/deposit|withdraw|cash ?out|purchase|buy/i)).toHaveCount(0)
  })

  test('balance and history persist across a reload', async ({ page }) => {
    await page.goto(`/play?seed=${BASE_WIN_SEED}`)
    await page.getByTestId('spin-button').click()
    await page.getByTestId('spin-button').click()
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE', { timeout: 5_000 })
    const balance = await value(page, 'balance')
    await page.reload()
    expect(await value(page, 'balance')).toBe(balance)
    await expect(page.getByText('Session history (1)')).toBeVisible()
  })
})
