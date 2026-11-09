/**
 * Phone layout (dev and production): crisp integer device-pixel scaling, no horizontal
 * scroll at 360–430 px, a large thumb-reachable Spin button and ≥ 44 px tap targets.
 */
import { expect, test } from '@playwright/test'

const ART_WIDTH = 260 // reel frame, art pixels
const MAX_CSS_SCALE = 2

for (const width of [360, 390, 430]) {
  for (const dpr of [1, 2, 3]) {
    test.describe(`${width} px at DPR ${dpr}`, () => {
      test.use({ viewport: { width, height: 844 }, deviceScaleFactor: dpr })

      test('reels use the largest whole number of device pixels per art pixel', async ({ page }) => {
        await page.goto('/play')
        await expect(page.getByTestId('reels')).toBeVisible()
        const m = await page.evaluate(() => {
          const stage = document.querySelector<HTMLElement>('[data-testid="slot"]')!
          const cs = getComputedStyle(stage)
          const space = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
          const frame = document.querySelector<HTMLElement>('[data-testid="reels"]')!.getBoundingClientRect()
          return {
            space,
            frameWidth: frame.width,
            left: frame.left,
            dpr: window.devicePixelRatio,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }
        })
        expect(m.dpr).toBe(dpr)
        const k = (m.frameWidth * dpr) / ART_WIDTH
        expect(Math.abs(k - Math.round(k))).toBeLessThan(0.01) // whole device px per art px
        const kInt = Math.round(k)
        const fits = (n: number) => (ART_WIDTH * n) / dpr <= m.space + 0.01
        expect(fits(kInt)).toBe(true)
        // The next size up would not fit (or would pass the desktop cap).
        expect(!fits(kInt + 1) || kInt + 1 > MAX_CSS_SCALE * dpr).toBe(true)
        expect(m.left).toBeGreaterThanOrEqual(0)
        expect(m.overflow).toBeLessThanOrEqual(0)
      })
    })
  }
}

test.describe('portrait layout at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })

  test('order: reels, Spin, balance, bet, then the other buttons; Spin in thumb reach', async ({ page }) => {
    await page.goto('/play')
    const top = async (id: string) => (await page.getByTestId(id).boundingBox())!.y
    const reels = await top('reels')
    const spin = (await page.getByTestId('spin-button').boundingBox())!
    expect(spin.y).toBeGreaterThan(reels)
    expect(spin.width).toBeGreaterThanOrEqual(88)
    expect(spin.y + spin.height).toBeLessThanOrEqual(844) // visible without scrolling
    expect(await top('balance')).toBeGreaterThan(spin.y)
    expect(await top('bet-25')).toBeGreaterThan(await top('balance'))
    expect(await top('mute-button')).toBeGreaterThan(await top('bet-25'))
    expect(await top('rules-button')).toBeGreaterThan(await top('bet-25'))
  })

  test('every control on the game is at least 44 × 44 px', async ({ page }) => {
    await page.goto('/play')
    const buttons = page.getByTestId('slot').locator('button:visible')
    const n = await buttons.count()
    expect(n).toBeGreaterThanOrEqual(7)
    for (let i = 0; i < n; i++) {
      const box = (await buttons.nth(i).boundingBox())!
      const name = (await buttons.nth(i).getAttribute('aria-label')) ?? (await buttons.nth(i).innerText())
      expect(box.height, name).toBeGreaterThanOrEqual(44)
      expect(box.width, name).toBeGreaterThanOrEqual(44)
    }
  })
})

test('mute toggle is a pressed-state button and remembers the choice', async ({ page }) => {
  await page.goto('/play')
  const mute = page.getByRole('button', { name: 'Mute sound' })
  await expect(mute).toHaveAttribute('aria-pressed', 'false')
  await mute.click()
  await expect(mute).toHaveAttribute('aria-pressed', 'true')
  await expect(mute).toContainText('Sound off')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'true')
})

test('no audio errors when WebAudio is missing', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.addInitScript(() => {
    // Simulate a browser without WebAudio.
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true })
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined, configurable: true })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/play')
  await page.getByTestId('spin-button').click()
  await expect(page.getByTestId('balance')).not.toHaveAttribute('data-value', '10000')
  await expect(page.getByTestId('reels')).toHaveAttribute('data-stops', /\d/, { timeout: 5_000 })
  expect(errors).toEqual([])
})
