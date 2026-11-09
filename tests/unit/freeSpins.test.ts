import { describe, expect, it } from 'vitest'
import { drawWeighted, drawWildMultipliers, playFeature } from '../../src/models/freeSpins'
import {
  BASE_PAYTABLE,
  COINS_PER_BET,
  MAX_FREE_SPINS,
  RETRIGGER_SPINS,
  WILD_MULTIPLIER_WEIGHTS,
  WIN_CAP_COINS,
} from '../../src/models/paytable'
import { createRngFromSource, createSeededRng } from '../../src/models/rng'
import { FREE_SPIN_RULES, GAME_MATH, spin, type GameMath } from '../../src/models/spin'
import type { ReelStrips, SpinResult, SymbolId } from '../../src/models/types'

const S = (line: string): SymbolId[] =>
  line.split(' ').map((a) => ({
    WH: 'WHALE', SH: 'SHARK', OC: 'OCTOPUS', TU: 'TURTLE', AN: 'ANGLER', PE: 'PEARL',
    SE: 'SHELL', ST: 'STARFISH', AC: 'ANCHOR', WI: 'WILD', CH: 'CHEST',
  })[a] as SymbolId)

/**
 * Base strips that always show exactly `chests` chests (one per reel on the first
 * `chests` reels: every 3-row window of a 3-stop strip shows each stop once) and never
 * pay on ways (reel 2 never matches reel 1).
 */
function triggerStrips(chests: number): ReelStrips {
  const fillers = ['PE', 'SE', 'ST', 'AC', 'TU']
  return fillers.map((f, reel) => S(reel < chests ? `CH ${f} ${f}` : `${f} ${f} ${f}`))
}

/** Free-spin strips with no wins and no chests: every free spin pays 0. */
const BLANK_FS: ReelStrips = [S('PE'), S('SE'), S('ST'), S('AC'), S('TU')]

/** Free-spin strips that show exactly 3 chests (and nothing else that pays) every spin. */
const RETRIGGER_FS: ReelStrips = [S('CH PE PE'), S('CH SE SE'), S('CH ST ST'), S('AC'), S('TU')]

/** Free-spin strips that pay far more than the cap on any spin: whales through 9 wilds. */
const HUGE_FS: ReelStrips = [S('WH'), S('WI'), S('WI'), S('WI'), S('WH')]

function testMath(baseStrips: ReelStrips, fsStrips: ReelStrips): GameMath {
  return { ...GAME_MATH, baseStrips, freeSpins: { ...FREE_SPIN_RULES, strips: fsStrips } }
}

describe('feature trigger', () => {
  it.each([
    [3, 8],
    [4, 12],
    [5, 20],
  ])('%i chests ⇒ %i free spins, all played', (chests, spins) => {
    const r = spin(createSeededRng(1), testMath(triggerStrips(chests), BLANK_FS))
    expect(r.freeSpinsAwarded).toBe(spins)
    expect(r.feature).not.toBeNull()
    expect(r.feature!.initialSpins).toBe(spins)
    expect(r.feature!.totalSpinsAwarded).toBe(spins)
    expect(r.feature!.spins).toHaveLength(spins)
    expect(r.feature!.spins.map((s) => s.index)).toEqual(Array.from({ length: spins }, (_, i) => i + 1))
    expect(r.feature!.spins.map((s) => s.spinsRemaining)).toEqual(
      Array.from({ length: spins }, (_, i) => spins - 1 - i),
    )
    expect(r.feature!.totalCoins).toBe(0)
    // The base spin still pays its chests.
    expect(r.baseCoins).toBe(BASE_PAYTABLE.scatter.betMultipliers[chests] * COINS_PER_BET)
    expect(r.totalCoins).toBe(r.baseCoins)
  })

  it('2 chests do not trigger', () => {
    const r = spin(createSeededRng(1), testMath(triggerStrips(2), BLANK_FS))
    expect(r.feature).toBeNull()
    expect(r.totalCoins).toBe(0)
  })
})

describe('retriggers, chest pays and the 50-spin limit', () => {
  const r = spin(createSeededRng(2), testMath(triggerStrips(3), RETRIGGER_FS))
  const f = r.feature!
  const chestPay = BASE_PAYTABLE.scatter.betMultipliers[3] * COINS_PER_BET

  it('3 chests during free spins add +5 spins (not 8)', () => {
    expect(f.spins[0].retriggerSpins).toBe(RETRIGGER_SPINS)
    expect(f.spins[0].spinsRemaining).toBe(8 - 1 + RETRIGGER_SPINS)
  })

  it('stops at exactly 50 free spins; the retrigger that would pass 50 is trimmed', () => {
    expect(f.totalSpinsAwarded).toBe(MAX_FREE_SPINS)
    expect(f.spins).toHaveLength(MAX_FREE_SPINS)
    // 8 + 8 × 5 = 48, so the 9th retrigger is trimmed to 2 and later ones to 0.
    expect(f.spins.map((s) => s.retriggerSpins)).toEqual([...Array(8).fill(5), 2, ...Array(41).fill(0)])
    expect(f.retriggers).toBe(9)
    expect(f.spins.at(-1)!.spinsRemaining).toBe(0)
  })

  it('chests pay their scatter pay on every free spin, running total adds up', () => {
    for (const s of f.spins) {
      expect(s.scatterWin).toMatchObject({ count: 3, coins: chestPay })
      expect(s.coins).toBe(chestPay)
    }
    expect(f.totalCoins).toBe(MAX_FREE_SPINS * chestPay)
    expect(r.totalCoins).toBe(chestPay + MAX_FREE_SPINS * chestPay)
    expect(f.spins.at(-1)!.runningTotalCoins).toBe(r.totalCoins)
    expect(r.capped).toBe(false)
  })
})

describe('win cap', () => {
  it('clamps the running total at 5,000× bet and ends the feature early', () => {
    const r = spin(createSeededRng(3), testMath(triggerStrips(3), HUGE_FS))
    const f = r.feature!
    expect(r.freeSpinsAwarded).toBe(8)
    expect(f.spins).toHaveLength(1) // ended on the first free spin
    expect(f.endedByCap).toBe(true)
    expect(f.spins[0].uncappedCoins).toBeGreaterThan(WIN_CAP_COINS)
    expect(f.spins[0].coins).toBe(WIN_CAP_COINS - r.baseCoins)
    expect(f.spins[0]).toMatchObject({ capped: true, spinsRemaining: 0, runningTotalCoins: WIN_CAP_COINS })
    expect(r.totalCoins).toBe(WIN_CAP_COINS)
    expect(r.capped).toBe(true)
  })

  it('counts the base spin toward the cap', () => {
    const f = playFeature(createSeededRng(4), { ...FREE_SPIN_RULES, strips: RETRIGGER_FS }, 8, WIN_CAP_COINS - 10)
    expect(f.spins).toHaveLength(1)
    expect(f.totalCoins).toBe(10)
    expect(f.endedByCap).toBe(true)
    expect(f.spins[0].retriggerSpins).toBe(0) // no retrigger once the cap ends the feature
  })

  it('plays nothing if the base spin already reached the cap', () => {
    const f = playFeature(createSeededRng(4), FREE_SPIN_RULES, 8, WIN_CAP_COINS)
    expect(f.spins).toHaveLength(0)
    expect(f.totalCoins).toBe(0)
    expect(f.endedByCap).toBe(true)
  })
})

describe('wild multipliers in free spins', () => {
  it('every wild gets a multiplier from the table; other cells get 0', () => {
    const r = spin(createSeededRng(5), testMath(triggerStrips(3), HUGE_FS))
    const s = r.feature!.spins[0]
    s.grid.forEach((w, reel) =>
      w.forEach((sym, row) => {
        const m = s.wildMultipliers[reel][row]
        if (sym === 'WILD') expect([2, 3]).toContain(m)
        else expect(m).toBe(0)
      }),
    )
  })

  it('drawWeighted follows the integer weights (scripted RNG)', () => {
    const total = WILD_MULTIPLIER_WEIGHTS.reduce((a, e) => a + e.weight, 0)
    const w2 = WILD_MULTIPLIER_WEIGHTS[0].weight
    const draws = Array.from({ length: total }, (_, i) => i)
    let k = 0
    const rng = createRngFromSource(() => draws[k++])
    const got = draws.map(() => drawWeighted(rng, WILD_MULTIPLIER_WEIGHTS))
    expect(got).toEqual([...Array(w2).fill(2), ...Array(total - w2).fill(3)])
  })

  it('drawWeighted frequencies match the weights (seeded, 200k draws)', () => {
    const rng = createSeededRng(9)
    const total = WILD_MULTIPLIER_WEIGHTS.reduce((a, e) => a + e.weight, 0)
    let threes = 0
    const n = 200_000
    for (let i = 0; i < n; i++) if (drawWeighted(rng, WILD_MULTIPLIER_WEIGHTS) === 3) threes++
    const p = WILD_MULTIPLIER_WEIGHTS[1].weight / total
    expect(Math.abs(threes / n - p)).toBeLessThan(4 * Math.sqrt((p * (1 - p)) / n))
  })

  it('draws one multiplier per wild, reel by reel then row by row', () => {
    let k = 0
    const rng = createRngFromSource(() => k++) // 0,1,2,… ⇒ 2,2,…,2 for draws 0..6, then 3s
    const g = [S('PE PE PE'), S('WI PE WI'), S('WI WI WI'), S('PE PE PE'), S('PE PE PE')]
    const m = drawWildMultipliers(rng, g, WILD_MULTIPLIER_WEIGHTS)
    expect(k).toBe(5)
    expect(m).toEqual([[0, 0, 0], [2, 0, 2], [2, 2, 2], [0, 0, 0], [0, 0, 0]])
  })
})

describe('determinism (Model decides, View replays)', () => {
  function findFeatureSpin(seed: number): SpinResult {
    const rng = createSeededRng(seed)
    for (;;) {
      const r = spin(rng)
      if (r.feature && r.feature.spins.length > 0) return r
    }
  }

  it('same seed ⇒ identical full SpinResult, including every free spin', () => {
    for (const seed of [11, 12, 13]) {
      const a = findFeatureSpin(seed)
      const b = findFeatureSpin(seed)
      expect(a).toEqual(b)
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    }
  })

  it('a real feature is internally consistent', () => {
    for (const seed of [21, 22, 23, 24, 25]) {
      const r = findFeatureSpin(seed)
      const f = r.feature!
      let running = r.baseCoins
      for (const s of f.spins) {
        const ways = s.wayWins.reduce((a, w) => a + w.coins, 0)
        expect(s.uncappedCoins).toBe(ways + (s.scatterWin?.coins ?? 0))
        running += s.coins
        expect(s.runningTotalCoins).toBe(running)
      }
      expect(r.totalCoins).toBe(running)
      expect(f.totalCoins).toBe(running - r.baseCoins)
      expect(f.totalSpinsAwarded).toBe(f.initialSpins + f.spins.reduce((a, s) => a + s.retriggerSpins, 0))
    }
  })
})
