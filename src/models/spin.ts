/**
 * One spin: the outcome, including any free-spin feature it triggers, is fully
 * decided here, before any animation.
 */
import { evaluateScatter, evaluateWays, gridFromStops } from './evaluator'
import { playFeature, type FreeSpinRules } from './freeSpins'
import {
  BASE_PAYTABLE,
  MAX_FREE_SPINS,
  RETRIGGER_SPINS,
  ROWS,
  WILD_MULTIPLIER_WEIGHTS,
  WIN_CAP_COINS,
  type Paytable,
} from './paytable'
import { BASE_STRIPS, FREE_SPIN_STRIPS } from './reelStrips'
import type { Rng } from './rng'
import type { ReelStrips, SpinResult } from './types'

/** Everything that defines the game's math. Tests can swap in their own. */
export interface GameMath {
  readonly baseStrips: ReelStrips
  readonly basePaytable: Paytable
  readonly freeSpins: FreeSpinRules
  readonly winCapCoins: number
  readonly rows: number
}

export const FREE_SPIN_RULES: FreeSpinRules = {
  strips: FREE_SPIN_STRIPS,
  paytable: BASE_PAYTABLE,
  wildMultiplierWeights: WILD_MULTIPLIER_WEIGHTS,
  retriggerSpins: RETRIGGER_SPINS,
  maxSpins: MAX_FREE_SPINS,
  winCapCoins: WIN_CAP_COINS,
  rows: ROWS,
}

export const GAME_MATH: GameMath = {
  baseStrips: BASE_STRIPS,
  basePaytable: BASE_PAYTABLE,
  freeSpins: FREE_SPIN_RULES,
  winCapCoins: WIN_CAP_COINS,
  rows: ROWS,
}

/**
 * Evaluate the base spin that lands on `stops` (no feature played; `feature` is null).
 * Shared by spinBase, spin and the exhaustive tests, so all go through exactly the
 * same code path.
 *
 * Win cap: the base spin alone cannot reach WIN_CAP_COINS. Bound: ways pay at most
 * the top 5-of-a-kind pay on every way, 500 × 243 = 121,500 coins (no symbol can pay
 * more ways than the grid has), plus the top scatter pay 50 × 25 = 1,250, total
 * 122,750 < 125,000. The clamp is kept so the rule holds even if the paytable changes.
 */
export function resultFromStops(
  strips: ReelStrips,
  stops: readonly number[],
  paytable: Paytable = BASE_PAYTABLE,
  rows: number = ROWS,
  winCapCoins: number = WIN_CAP_COINS,
): SpinResult {
  const grid = gridFromStops(strips, stops, rows)
  const wayWins = evaluateWays(grid, paytable)
  const scatterWin = evaluateScatter(grid, paytable)

  let uncapped = scatterWin ? scatterWin.coins : 0
  for (const win of wayWins) uncapped += win.coins
  const capped = uncapped >= winCapCoins
  const baseCoins = capped ? winCapCoins : uncapped

  return {
    stops: [...stops],
    grid,
    wayWins,
    scatterWin,
    baseCoins,
    totalCoins: baseCoins,
    capped,
    freeSpinsAwarded: scatterWin ? scatterWin.freeSpinsAwarded : 0,
    feature: null,
  }
}

/** Base spin only (no feature): one uniform stop per reel, then evaluate. */
export function spinBase(
  rng: Rng,
  strips: ReelStrips = BASE_STRIPS,
  paytable: Paytable = BASE_PAYTABLE,
): SpinResult {
  const stops = strips.map((strip) => rng.nextInt(strip.length))
  return resultFromStops(strips, stops, paytable)
}

/**
 * A complete paid spin: the base spin plus, if it triggers, the whole free-spin
 * feature, with the win cap applied to the running total of both.
 */
export function spin(rng: Rng, math: GameMath = GAME_MATH): SpinResult {
  const stops = math.baseStrips.map((strip) => rng.nextInt(strip.length))
  const base = resultFromStops(math.baseStrips, stops, math.basePaytable, math.rows, math.winCapCoins)
  if (base.freeSpinsAwarded === 0) return base

  const freeSpins = { ...math.freeSpins, winCapCoins: math.winCapCoins }
  const feature = playFeature(rng, freeSpins, base.freeSpinsAwarded, base.baseCoins)
  const totalCoins = base.baseCoins + feature.totalCoins
  return {
    ...base,
    totalCoins,
    capped: base.capped || feature.endedByCap,
    feature,
  }
}
