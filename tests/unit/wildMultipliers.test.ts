import { describe, expect, it } from 'vitest'
import { countMatches, evaluateWays } from '../../src/models/evaluator'
import { BASE_PAYTABLE, waySymbols, waysPay, type Paytable } from '../../src/models/paytable'
import { createSeededRng, type Rng } from '../../src/models/rng'
import type { Grid, SymbolId, WaySymbol, WildMultipliers } from '../../src/models/types'
import { grid } from './gridHelpers'
import { PASS1_PAYTABLE } from './pass1Paytable'

const P = BASE_PAYTABLE

/** Multipliers for the WILD cells of `g`, in reel-then-row order; 0 elsewhere. */
function mults(g: Grid, wildValues: number[]): WildMultipliers {
  let i = 0
  const out = g.map((w) => w.map((s) => (s === 'WILD' ? wildValues[i++] : 0)))
  if (i !== wildValues.length) throw new Error(`grid has ${i} wilds, got ${wildValues.length} values`)
  return out
}

/**
 * Brute force: walk every way (one matching cell per reel, reels 1..k) and add up its
 * multiplier: the SUM of the multipliers of the wilds it passes, or 1 if it passes none.
 */
function bruteForceMultipliedWays(g: Grid, m: WildMultipliers, symbol: WaySymbol, k: number): number {
  let total = 0
  const walk = (reel: number, wildSum: number): void => {
    if (reel === k) {
      total += wildSum > 0 ? wildSum : 1
      return
    }
    g[reel].forEach((s, row) => {
      if (s === symbol) walk(reel + 1, wildSum)
      else if (s === 'WILD') walk(reel + 1, wildSum + m[reel][row])
    })
  }
  walk(0, 0)
  return total
}

/** Full brute-force evaluation of every symbol: [symbol, reels, multipliedWays, coins]. */
function bruteForceWins(g: Grid, m: WildMultipliers | null, paytable: Paytable) {
  const out: [WaySymbol, number, number, number][] = []
  for (const symbol of waySymbols(paytable)) {
    let k = 0
    while (k < g.length && countMatches(g[k], symbol) > 0) k++
    const pay = waysPay(paytable, symbol, k)
    if (pay === 0) continue
    const zero = g.map((w) => w.map(() => 0))
    const mw = bruteForceMultipliedWays(g, m ?? zero, symbol, k)
    out.push([symbol, k, mw, mw * pay])
  }
  return out
}

const ALL: SymbolId[] = ['WHALE', 'SHARK', 'OCTOPUS', 'TURTLE', 'ANGLER', 'PEARL', 'SHELL', 'STARFISH', 'ANCHOR', 'WILD', 'CHEST']

/** Random grid biased toward few symbols and many wilds so long ways and mixed paths are common. */
function randomGrid(rng: Rng, rows: number): Grid {
  const pool = ALL.slice(0, 2 + rng.nextInt(8)) // 2..9 way symbols
  return Array.from({ length: 5 }, (_, reel) =>
    Array.from({ length: rows }, () => {
      const r = rng.nextInt(10)
      if (reel >= 1 && reel <= 3 && r < 3) return 'WILD'
      if (r === 3) return 'CHEST'
      return pool[rng.nextInt(pool.length)]
    }),
  )
}

describe('evaluateWays with wild multipliers vs brute-force path enumeration', () => {
  it('matches on 12,000 random grids with random ×1–×5 wild multipliers (3 and 4 rows)', () => {
    const rng = createSeededRng(424242)
    let mismatches = 0
    let multipliedCases = 0
    for (let n = 0; n < 12_000; n++) {
      const rows = n % 4 === 0 ? 4 : 3
      const g = randomGrid(rng, rows)
      const m = g.map((w) => w.map((s) => (s === 'WILD' ? 1 + rng.nextInt(5) : 0)))
      const fast = evaluateWays(g, P, m).map((w) => [w.symbol, w.reels, w.multipliedWays, w.coins])
      const slow = bruteForceWins(g, m, P)
      if (JSON.stringify(fast) !== JSON.stringify(slow)) mismatches++
      if (fast.some((w, i) => w[2] !== evaluateWays(g, P)[i]?.ways)) multipliedCases++
    }
    expect(mismatches).toBe(0)
    expect(multipliedCases).toBeGreaterThan(3_000) // the multiplier path is really exercised
  })

  it('with no multipliers, multipliedWays equals ways (base game) on 5,000 random grids', () => {
    const rng = createSeededRng(7)
    for (let n = 0; n < 5_000; n++) {
      const g = randomGrid(rng, 3)
      for (const w of evaluateWays(g, P)) {
        expect(w.multipliedWays).toBe(w.ways)
        expect(w.coins).toBe(w.ways * w.coinsPerWay)
      }
      // Brute force with no multipliers counts every way at ×1.
      expect(evaluateWays(g, P).map((w) => [w.symbol, w.reels, w.multipliedWays, w.coins])).toEqual(
        bruteForceWins(g, null, P),
      )
    }
  })
})

describe('wild multiplier hand cases', () => {
  // Reel 1 SHELL; no other symbol reaches a paying length.
  const shell3 = grid('SE TU AN', 'WI PE OC', 'SE PE ST', 'TU OC SH', 'PE SH OC')

  it('one ×2 wild on a way ⇒ ×2', () => {
    const win = evaluateWays(shell3, P, mults(shell3, [2])).find((w) => w.symbol === 'SHELL')
    expect(win).toMatchObject({ reels: 3, ways: 1, multipliedWays: 2, coins: 2 * waysPay(P, 'SHELL', 3) })
  })

  it('×2 + ×3 wilds on one way ADD to ×5 (not ×6)', () => {
    const g = grid('SE TU AN', 'WI PE OC', 'WI PE ST', 'SE OC SH', 'PE SH OC')
    const win = evaluateWays(g, P, mults(g, [2, 3])).find((w) => w.symbol === 'SHELL')
    expect(win).toMatchObject({ reels: 4, ways: 1, multipliedWays: 5, coins: 5 * waysPay(P, 'SHELL', 4) })
  })

  it('three wilds on one way: ×3 + ×3 + ×3 = ×9, the maximum', () => {
    const g = grid('SE TU AN', 'WI PE OC', 'WI PE ST', 'WI OC SH', 'SE SH OC')
    const win = evaluateWays(g, P, mults(g, [3, 3, 3])).find((w) => w.symbol === 'SHELL')
    expect(win).toMatchObject({ reels: 5, ways: 1, multipliedWays: 9 })
  })

  it('ways through different wilds get different multipliers (1 + 2 + 3 = 6)', () => {
    // SHELL ways: reel 2 offers a SHELL (×1), a ×2 wild and a ×3 wild.
    const g = grid('SE TU AN', 'WI WI SE', 'SE PE ST', 'TU OC SH', 'PE SH OC')
    const win = evaluateWays(g, P, mults(g, [2, 3])).find((w) => w.symbol === 'SHELL')
    expect(win).toMatchObject({ reels: 3, ways: 3, multipliedWays: 6, coins: 6 * waysPay(P, 'SHELL', 3) })
  })

  it('a way with no wild stays ×1 next to multiplied ways', () => {
    // Reel 2: SHELL, ×2 wild. Reel 3: SHELL, ×3 wild. Ways: SE-SE (1), SE-W3 (3), W2-SE (2), W2-W3 (5).
    const g = grid('SE TU AN', 'SE WI PE', 'SE WI ST', 'TU OC SH', 'PE SH OC')
    const win = evaluateWays(g, P, mults(g, [2, 3])).find((w) => w.symbol === 'SHELL')
    expect(win).toMatchObject({ ways: 4, multipliedWays: 1 + 3 + 2 + 5 })
  })

  it('base-game evaluation (no multipliers) is unchanged from pass 1 on the same grid', () => {
    const g = grid('SE SE AC', 'WI SE PE', 'SE TU ST', 'OC SH AN', 'TU AN OC')
    expect(evaluateWays(g, PASS1_PAYTABLE)).toEqual([
      { symbol: 'SHELL', reels: 3, matchesPerReel: [2, 2, 1], ways: 4, coinsPerWay: 10, multipliedWays: 4, coins: 40 },
    ])
    // The same grid with a ×2 wild: 2 natural ways × 1 + 2 wild ways × 2 = 6.
    expect(evaluateWays(g, PASS1_PAYTABLE, mults(g, [2]))[0]).toMatchObject({ ways: 4, multipliedWays: 6, coins: 60 })
  })

  it('rejects malformed multiplier grids', () => {
    expect(() => evaluateWays(shell3, P, mults(shell3, [0]))).toThrow(/bad wild multiplier/)
    const onNonWild = shell3.map((w) => w.map(() => 2))
    expect(() => evaluateWays(shell3, P, onNonWild)).toThrow(/bad wild multiplier/)
    expect(() => evaluateWays(shell3, P, [[0, 0, 0]])).toThrow(/one column per reel/)
  })
})
