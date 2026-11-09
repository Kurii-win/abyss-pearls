import { describe, expect, it } from 'vitest'
import { REELS, ROWS } from '../../src/models/paytable'
import { BASE_STRIPS, FREE_SPIN_STRIPS } from '../../src/models/reelStrips'
import { SYMBOL_IDS, type ReelStrip, type SymbolId } from '../../src/models/types'

function positionsOf(strip: ReelStrip, symbol: SymbolId): number[] {
  return strip.flatMap((s, i) => (s === symbol ? [i] : []))
}

/** Longest circular run of `symbol`. */
function longestRun(strip: ReelStrip, symbol: SymbolId): number {
  if (strip.every((s) => s === symbol)) return strip.length
  let best = 0
  let run = 0
  for (let i = 0; i < strip.length * 2; i++) {
    run = strip[i % strip.length] === symbol ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

describe.each([
  ['BASE_STRIPS v1', BASE_STRIPS],
  ['FREE_SPIN_STRIPS v1', FREE_SPIN_STRIPS],
] as const)('%s', (_name, STRIPS) => {
  it('has one strip per reel, 40–60 stops each, valid symbols only', () => {
    expect(STRIPS).toHaveLength(REELS)
    for (const strip of STRIPS) {
      expect(strip.length).toBeGreaterThanOrEqual(40)
      expect(strip.length).toBeLessThanOrEqual(60)
      for (const s of strip) expect(SYMBOL_IDS).toContain(s)
    }
  })

  it('has WILD only on reels 2–4', () => {
    STRIPS.forEach((strip, reel) => {
      const wilds = positionsOf(strip, 'WILD').length
      if (reel === 0 || reel === REELS - 1) expect(wilds).toBe(0)
    })
    expect(STRIPS.slice(1, 4).some((s) => s.includes('WILD'))).toBe(true)
  })

  it('spaces chests at least ROWS apart circularly (≤ 1 chest visible per reel)', () => {
    for (const strip of STRIPS) {
      const chests = positionsOf(strip, 'CHEST')
      for (let i = 0; i < chests.length; i++) {
        for (let j = i + 1; j < chests.length; j++) {
          const d = chests[j] - chests[i]
          expect(Math.min(d, strip.length - d)).toBeGreaterThanOrEqual(ROWS)
        }
      }
      // Direct check of every window as well.
      for (let stop = 0; stop < strip.length; stop++) {
        let visible = 0
        for (let r = 0; r < ROWS; r++) if (strip[(stop + r) % strip.length] === 'CHEST') visible++
        expect(visible).toBeLessThanOrEqual(1)
      }
    }
  })

  it('stacks WHALE in runs of 1–3', () => {
    for (const strip of STRIPS) {
      expect(strip).toContain('WHALE')
      expect(longestRun(strip, 'WHALE')).toBeLessThanOrEqual(3)
    }
  })
})

describe('free-spin strips vs base strips', () => {
  it('are a separate, wild-richer set', () => {
    expect(FREE_SPIN_STRIPS).not.toBe(BASE_STRIPS)
    const wilds = (strips: typeof BASE_STRIPS) =>
      strips.reduce((a, s) => a + positionsOf(s, 'WILD').length / s.length, 0)
    expect(wilds(FREE_SPIN_STRIPS)).toBeGreaterThan(wilds(BASE_STRIPS))
  })
})
