import { expect, test } from '@playwright/test'

test('home page shows the Abyss Pearls heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Abyss Pearls' })).toBeVisible()
})
