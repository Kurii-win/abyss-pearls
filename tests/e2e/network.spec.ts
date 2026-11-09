/**
 * Runtime network sanity (dev and production): every request the site makes goes to
 * its own origin. No CDNs, fonts, analytics or any other third party.
 */
import { expect, test } from '@playwright/test'

test('every request is same-origin across all pages and a spin', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const foreign: string[] = []
  let requests = 0
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.protocol === 'data:' || url.protocol === 'blob:') return
    requests++
    if (url.origin !== origin) foreign.push(req.url())
  })

  for (const path of ['/', '/math', '/architecture', '/contact', '/no-such-page']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  await page.goto('/play')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const before = await page.getByTestId('balance').getAttribute('data-value')
  await page.getByTestId('spin-button').click()
  await expect(page.getByTestId('balance')).not.toHaveAttribute('data-value', before!)
  await expect(page.getByTestId('reels')).toHaveAttribute('data-stops', /\d/, { timeout: 5_000 })
  await page.getByRole('button', { name: 'Mute sound' }).click()

  expect(requests).toBeGreaterThan(0)
  expect(foreign).toEqual([])
})
