/**
 * Two tabs, one wallet (tester M5 FAIL regression). Dev only: uses the `?seed=` RNG.
 *
 * B (seed 11) spins a base win; A (idle) adopts it; while B is still showing its win,
 * A (seed 5) spins; then B presses Spin during its win display. B must re-read the
 * wallet before settling (so A's round is not overwritten), and must never fall back to
 * an older save later. Both tabs end on the ledger-correct balance and history.
 */
import { expect, test, type Page } from '@playwright/test'
import { createSeededRng } from '../../src/models/rng'
import { spin } from '../../src/models/spin'

const value = async (page: Page, testId: string) => Number(await page.getByTestId(testId).getAttribute('data-value'))

test('a spin pressed during a win display settles on the other tab’s newer wallet', async ({ context }) => {
  const rngB = createSeededRng(11)
  const b1 = spin(rngB).totalCoins
  const b2 = spin(rngB).totalCoins
  const a1 = spin(createSeededRng(5)).totalCoins
  const ledger = 10_000 - 3 * 25 + b1 + a1 + b2
  expect(b1).toBe(50)
  expect(ledger).toBe(9_975)

  const a = await context.newPage()
  const b = await context.newPage()
  await a.goto('/play?seed=5')
  await b.goto('/play?seed=11')
  await expect(a.getByTestId('balance')).toHaveAttribute('data-value', '10000')
  await expect(b.getByTestId('balance')).toHaveAttribute('data-value', '10000')

  // 1. B spins a base win and is showing it.
  await b.getByTestId('spin-button').click()
  await expect(b.getByTestId('slot')).toHaveAttribute('data-phase', 'SHOWING_WINS', { timeout: 5_000 })
  // 2. A (idle) adopts B's settled round.
  await expect(a.getByTestId('balance')).toHaveAttribute('data-value', String(10_000 - 25 + b1))
  // 3. A spins while B is still in its win display.
  await a.getByTestId('spin-button').click()
  await expect(a.getByTestId('slot')).not.toHaveAttribute('data-phase', 'IDLE')
  // 4. B presses Spin during its win display (WINS_DONE + SPIN in one handler).
  expect(await b.getByTestId('slot').getAttribute('data-phase')).toBe('SHOWING_WINS')
  await b.getByTestId('spin-button').click()

  // Both tabs finish and agree with the ledger.
  for (const page of [a, b]) {
    await expect(page.getByTestId('slot')).toHaveAttribute('data-phase', 'IDLE', { timeout: 8_000 })
  }
  for (const page of [a, b]) {
    await expect(page.getByTestId('balance')).toHaveAttribute('data-value', String(ledger), { timeout: 5_000 })
    await expect(page.getByText('Session history (3)')).toBeVisible()
  }
  // And it stays that way (no stale data applied later), including after a reload.
  await b.waitForTimeout(1_000)
  expect(await value(a, 'balance')).toBe(ledger)
  expect(await value(b, 'balance')).toBe(ledger)
  await a.reload()
  expect(await value(a, 'balance')).toBe(ledger)
  const stored = await a.evaluate(() => JSON.parse(localStorage.getItem('abyss-pearls:wallet:v1')!))
  expect(stored.balance).toBe(ledger)
  expect(stored.history).toHaveLength(3)
  expect(stored.rev).toBe(3)
})

test('wallets saved before revisions existed still load', async ({ page }) => {
  await page.goto('/play')
  await page.evaluate(() =>
    localStorage.setItem('abyss-pearls:wallet:v1', JSON.stringify({ balance: 4_200, betLevel: 1, history: [] })),
  )
  await page.reload()
  await expect(page.getByTestId('balance')).toHaveAttribute('data-value', '4200')
  await expect(page.getByTestId('bet')).toHaveAttribute('data-value', '50')
})
