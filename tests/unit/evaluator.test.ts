import { describe, expect, it } from 'vitest'
import { evaluateScatter, evaluateWays, gridFromStops } from '../../src/models/evaluator'
import { COINS_PER_BET } from '../../src/models/paytable'
import { resultFromStops } from '../../src/models/spin'
import type { ReelStrips } from '../../src/models/types'
import { grid } from './gridHelpers'
import { PASS1_PAYTABLE } from './pass1Paytable'

// Pass-1 cases, pinned to the v0 paytable: the expected values are unchanged from pass 1.
const P = PASS1_PAYTABLE

describe('evaluateWays', () => {
  it("Kurii's lesson example: 2 × 2 × 1 = 4 ways of SHELL on 3 reels", () => {
    const g = grid('SE SE AC', 'WI SE PE', 'SE TU ST', 'OC SH AN', 'TU AN OC')
    expect(evaluateWays(g, P)).toEqual([
      { symbol: 'SHELL', reels: 3, matchesPerReel: [2, 2, 1], ways: 4, coinsPerWay: 10, multipliedWays: 4, coins: 40 },
    ])
  })

  it('full screen of whales pays 243 ways × 500 coins', () => {
    const g = grid('WH WH WH', 'WH WH WH', 'WH WH WH', 'WH WH WH', 'WH WH WH')
    const wins = evaluateWays(g, P)
    expect(wins).toHaveLength(1)
    expect(wins[0]).toMatchObject({ symbol: 'WHALE', reels: 5, ways: 243, coinsPerWay: 500, coins: 121_500 })
  })

  it('wilds substitute: whales with wild-filled middle reels', () => {
    const g = grid('WH AC ST', 'WI WI WI', 'WI WI WI', 'WI WI WI', 'WH SE PE')
    const whale = evaluateWays(g, P).find((w) => w.symbol === 'WHALE')
    expect(whale).toMatchObject({ reels: 5, ways: 27, coins: 27 * 500 })
  })

  it('2-of-a-kind pays only for WHALE, SHARK and OCTOPUS', () => {
    const g = grid('WH SH OC', 'WH SH OC', 'TU AN PE', 'TU AN PE', 'TU AN PE')
    expect(evaluateWays(g, P).map((w) => [w.symbol, w.reels, w.coins])).toEqual([
      ['WHALE', 2, 40],
      ['SHARK', 2, 15],
      ['OCTOPUS', 2, 15],
    ])

    const lows = grid('TU SE AC', 'TU SE AC', 'WH SH OC', 'WH SH OC', 'WH SH OC')
    expect(evaluateWays(lows, P)).toEqual([])
  })

  it('a gap on reel 2 means no win even if reels 3–5 match', () => {
    const g = grid('SE AC ST', 'TU PE AN', 'SE SE SE', 'SE SE SE', 'SE SE SE')
    expect(evaluateWays(g, P)).toEqual([])
  })

  it('WILD never substitutes for CHEST', () => {
    const g = grid('CH TU AN', 'WI WI WI', 'CH WI WI', 'WI WI WI', 'TU AN SE')
    expect(evaluateScatter(g, P)).toBeNull() // only 2 chests
    expect(evaluateWays(g, P).some((w) => (w.symbol as string) === 'CHEST')).toBe(false)
  })

  it('rejects a WILD on reel 1 instead of paying an undefined wild-only way', () => {
    const g = grid('WI SE AC', 'SE SE SE', 'SE SE SE', 'TU TU TU', 'TU TU TU')
    expect(() => evaluateWays(g, P)).toThrow(/reel 1/)
  })

  it('is generic over rows: 5 × 4 full of whales is 1,024 ways', () => {
    const col = 'WH WH WH WH'
    const wins = evaluateWays(grid(col, col, col, col, col), P)
    expect(wins[0]).toMatchObject({ symbol: 'WHALE', ways: 1024, coins: 1024 * 500 })
  })
})

describe('evaluateScatter', () => {
  it.each([
    [3, 2, 8, 'CH TU AN', 'SE CH PE', 'AN ST CH', 'TU AN SE', 'PE SE ST'],
    [4, 10, 12, 'CH TU AN', 'SE CH PE', 'AN ST CH', 'TU CH SE', 'PE SE ST'],
    [5, 50, 20, 'CH TU AN', 'SE CH PE', 'AN ST CH', 'TU CH SE', 'PE SE CH'],
  ])('%i chests pay %i× bet and award %i free spins', (count, mult, spins, ...reels) => {
    const win = evaluateScatter(grid(...reels), P)
    expect(win).toEqual({
      symbol: 'CHEST',
      count,
      betMultiplier: mult,
      coins: mult * COINS_PER_BET,
      freeSpinsAwarded: spins,
    })
  })

  it('2 chests do nothing', () => {
    expect(evaluateScatter(grid('CH TU AN', 'SE CH PE', 'AN ST SE', 'TU AN SE', 'PE SE ST'), P)).toBeNull()
  })
})

describe('gridFromStops', () => {
  const strips: ReelStrips = [
    ['WHALE', 'SHARK', 'OCTOPUS', 'TURTLE', 'ANGLER'],
    ['PEARL', 'SHELL', 'STARFISH', 'ANCHOR'],
  ]

  it('reads the window top to bottom from the stop', () => {
    expect(gridFromStops(strips, [1, 0], 3)).toEqual([
      ['SHARK', 'OCTOPUS', 'TURTLE'],
      ['PEARL', 'SHELL', 'STARFISH'],
    ])
  })

  it('wraps around the end of the strip', () => {
    expect(gridFromStops(strips, [4, 3], 3)).toEqual([
      ['ANGLER', 'WHALE', 'SHARK'],
      ['ANCHOR', 'PEARL', 'SHELL'],
    ])
  })

  it('rejects out-of-range stops and wrong stop counts', () => {
    expect(() => gridFromStops(strips, [5, 0], 3)).toThrow(RangeError)
    expect(() => gridFromStops(strips, [0], 3)).toThrow()
  })
})

describe('resultFromStops', () => {
  it('adds ways and scatter wins and reports free spins', () => {
    const strips: ReelStrips = [
      ['CHEST', 'SHELL', 'SHELL', 'ANCHOR'],
      ['WILD', 'SHELL', 'CHEST', 'PEARL'],
      ['SHELL', 'TURTLE', 'CHEST', 'STARFISH'],
      ['OCTOPUS', 'SHARK', 'ANGLER', 'TURTLE'],
      ['TURTLE', 'ANGLER', 'OCTOPUS', 'PEARL'],
    ]
    const r = resultFromStops(strips, [0, 0, 0, 0, 0], P)
    // Reel 1: CH SE SE, reel 2: WI SE CH, reel 3: SE TU CH → SHELL 2×2×1 = 4 ways × 10.
    expect(r.wayWins.map((w) => [w.symbol, w.ways, w.coins])).toEqual([['SHELL', 4, 40]])
    expect(r.scatterWin?.count).toBe(3)
    expect(r.totalCoins).toBe(40 + 2 * COINS_PER_BET)
    expect(r.freeSpinsAwarded).toBe(8)
    expect(r.capped).toBe(false)
    expect(r.baseCoins).toBe(r.totalCoins)
    expect(r.feature).toBeNull() // resultFromStops never plays the feature
  })
})
