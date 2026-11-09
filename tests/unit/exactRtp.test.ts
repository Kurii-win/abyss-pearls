import { describe, expect, it } from 'vitest'
import { computeBaseHitFrequency, computeBaseRtp } from '../../src/models/exactRtp'
import { BASE_PAYTABLE, ROWS, type Paytable } from '../../src/models/paytable'
import { BASE_STRIPS } from '../../src/models/reelStrips'
import { resultFromStops } from '../../src/models/spin'
import type { ReelStrips, SymbolId } from '../../src/models/types'

/** Every stop combination through the real spin evaluation path. */
function bruteForce(strips: ReelStrips, paytable: Paytable, rows: number) {
  let coins = 0n
  let triggers = 0n
  let combos = 0n
  let hits = 0n
  const stops = new Array<number>(strips.length).fill(0)
  const visit = (reel: number): void => {
    if (reel === strips.length) {
      const r = resultFromStops(strips, stops, paytable, rows)
      expect(r.capped).toBe(false) // exact RTP ignores the cap; must not matter here
      coins += BigInt(r.totalCoins)
      if (r.freeSpinsAwarded > 0) triggers++
      if (r.totalCoins > 0) hits++
      combos++
      return
    }
    for (let s = 0; s < strips[reel].length; s++) {
      stops[reel] = s
      visit(reel + 1)
    }
  }
  visit(0)
  return { coins, triggers, combos, hits }
}

const S = (line: string): SymbolId[] =>
  line.split(' ').map((a) => ({
    WH: 'WHALE', SH: 'SHARK', OC: 'OCTOPUS', TU: 'TURTLE', AN: 'ANGLER', PE: 'PEARL',
    SE: 'SHELL', ST: 'STARFISH', AC: 'ANCHOR', WI: 'WILD', CH: 'CHEST',
  })[a] as SymbolId)

// Dense tiny strips: stacked whales, wilds on 2–4, chests close together (so more
// than one can show per reel) to exercise every branch of both calculations.
const TINY_A: ReelStrips = [
  S('WH WH SE CH SH AC PE'),
  S('WI WH SE OC CH TU'),
  S('SE WI WH WH CH ST AC SH'),
  S('WH AN WI CH SE PE OC'),
  S('WH WH WH SE CH CH TU'),
]

const TINY_B: ReelStrips = [
  S('SE ST AC PE SE CH'),
  S('WI SE ST WI AC CH PE'),
  S('ST WI SE AC CH CH'),
  S('SE AC ST WI PE CH SH'),
  S('ST SE AC CH PE OC'),
]

describe('computeBaseRtp vs brute force', () => {
  it.each([
    ['TINY_A, 3 rows', TINY_A, 3],
    ['TINY_B, 3 rows', TINY_B, 3],
    ['TINY_A, 4 rows', TINY_A, 4],
    ['TINY_B, 2 rows', TINY_B, 2],
  ] as const)('%s matches exactly', (_name, strips, rows) => {
    const exact = computeBaseRtp(strips, BASE_PAYTABLE, rows)
    const brute = bruteForce(strips, BASE_PAYTABLE, rows)

    expect(exact.combinations).toBe(brute.combos)
    expect(exact.waysCoinsTotal + exact.scatterCoinsTotal).toBe(brute.coins)
    expect(exact.featureTriggerCombinations).toBe(brute.triggers)
    expect(brute.coins).toBeGreaterThan(0n)
    expect(brute.triggers).toBeGreaterThan(0n)

    const hit = computeBaseHitFrequency(strips, BASE_PAYTABLE, rows)
    expect(hit.combinations).toBe(brute.combos)
    expect(hit.hitCombinations).toBe(brute.hits)

    const bruteRtp = Number(brute.coins) / Number(brute.combos) / BASE_PAYTABLE.coinsPerBet
    expect(Math.abs(exact.rtp - bruteRtp)).toBeLessThan(1e-12)
  })
})

describe('computeBaseRtp on BASE_STRIPS v1', () => {
  const report = computeBaseRtp(BASE_STRIPS, BASE_PAYTABLE, ROWS)

  it('is internally consistent', () => {
    expect(report.rtp).toBeCloseTo(report.baseLineRtp + report.scatterRtp, 12)
    const bySymbol = Object.values(report.waysRtpBySymbol).reduce((a, b) => a + b, 0)
    expect(bySymbol).toBeCloseTo(report.baseLineRtp, 12)
    const totalP = report.chestCountProbabilities.reduce((a, b) => a + b, 0)
    expect(totalP).toBeCloseTo(1, 12)
    // At most one chest per reel is visible, so 6+ chests are impossible.
    report.chestCountProbabilities.slice(6).forEach((p) => expect(p).toBe(0))
  })

  it('sits on the tuned targets: base ≈ 68% (±2 pp), trigger 1 in 130–180, hit frequency 28–35%', () => {
    expect(report.rtp).toBeGreaterThan(0.66)
    expect(report.rtp).toBeLessThan(0.70)
    const oneIn = 1 / report.featureTriggerProbability
    expect(oneIn).toBeGreaterThan(130)
    expect(oneIn).toBeLessThan(180)
    const hit = computeBaseHitFrequency(BASE_STRIPS, BASE_PAYTABLE, ROWS).hitFrequency
    expect(hit).toBeGreaterThan(0.28)
    expect(hit).toBeLessThan(0.35)
  })

  it('rejects strips with a wild on reel 1', () => {
    const bad: ReelStrips = [S('WI SE AC'), ...BASE_STRIPS.slice(1)]
    expect(() => computeBaseRtp(bad, BASE_PAYTABLE)).toThrow(/reel 1/)
  })
})
