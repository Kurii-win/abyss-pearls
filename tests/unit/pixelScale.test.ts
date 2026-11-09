import { describe, expect, it } from 'vitest'
import { choosePixelScale, sanitizeDpr } from '../../src/controllers/pixelScale'

/** The reel frame is 260 art px wide; desktop look caps the scale at 2 CSS px per art px. */
const reels = (availableCssPx: number, devicePixelRatio: number) =>
  choosePixelScale({ availableCssPx, artWidth: 260, devicePixelRatio, maxCssScale: 2 })

describe('choosePixelScale (whole device pixels per art pixel)', () => {
  it('390 px wide phone at DPR 1, 2 and 3', () => {
    expect(reels(390, 1)).toEqual({ devicePxPerArtPx: 1, cssScale: 1 }) // 260 css px, 48 px cells
    expect(reels(390, 2)).toEqual({ devicePxPerArtPx: 3, cssScale: 1.5 }) // 390 css px, 72 px cells
    expect(reels(390, 3)).toEqual({ devicePxPerArtPx: 4, cssScale: 4 / 3 }) // 346.7 css px, 64 px cells
  })

  it('360 and 430 px phones', () => {
    expect(reels(360, 3).devicePxPerArtPx).toBe(4) // 1080 / 260 = 4.15
    expect(reels(360, 2).devicePxPerArtPx).toBe(2) // 720 / 260 = 2.77 → 260 css px
    expect(reels(430, 3).devicePxPerArtPx).toBe(4) // 1290 / 260 = 4.96
    expect(reels(430, 2).devicePxPerArtPx).toBe(3)
  })

  it('the art never overflows the space (unless even 1 device px per art px is too wide)', () => {
    for (const dpr of [1, 1.25, 1.5, 2, 2.625, 3, 4]) {
      for (let w = 200; w <= 1400; w += 7) {
        const s = reels(w, dpr)
        expect(Number.isInteger(s.devicePxPerArtPx)).toBe(true)
        expect(s.cssScale * dpr).toBeCloseTo(s.devicePxPerArtPx, 9)
        if (s.devicePxPerArtPx > 1) expect(260 * s.cssScale).toBeLessThanOrEqual(w + 1e-9)
        expect(s.cssScale).toBeLessThanOrEqual(2)
      }
    }
  })

  it('DPR 1 gives integer CSS scales, capped at the desktop scale', () => {
    expect(reels(600, 1)).toEqual({ devicePxPerArtPx: 2, cssScale: 2 })
    expect(reels(2000, 1).cssScale).toBe(2)
    expect(reels(2000, 2)).toEqual({ devicePxPerArtPx: 4, cssScale: 2 })
  })

  it('exact fits are not lost to float error', () => {
    expect(reels(390, 2).devicePxPerArtPx).toBe(3) // 390 × 2 / 260 = 3 exactly
    expect(reels(520, 1).devicePxPerArtPx).toBe(2)
  })

  it('never below 1 device px per art px; bad DPR falls back to 1', () => {
    expect(reels(100, 1)).toEqual({ devicePxPerArtPx: 1, cssScale: 1 })
    expect(reels(-5, 2).devicePxPerArtPx).toBe(1)
    for (const bad of [0, -1, NaN, Infinity]) expect(sanitizeDpr(bad)).toBe(1)
    expect(reels(390, NaN)).toEqual({ devicePxPerArtPx: 1, cssScale: 1 })
  })
})
