/**
 * The "Abyss Dive" free-spin feature (docs/MATH.md §4). Pure model: given an Rng it
 * plays the whole feature up front, so the View only replays the stored result.
 *
 * RNG draw order (fixed, so a seed reproduces a feature exactly). For each free spin:
 *   1. one stop per reel, reel 1 first;
 *   2. one multiplier per WILD on the grid, reel by reel, top row first.
 */
import { evaluateScatter, evaluateWays, gridFromStops } from './evaluator'
import type { Paytable } from './paytable'
import type { Rng } from './rng'
import type { FeatureResult, FreeSpinResult, Grid, ReelStrips, WildMultipliers } from './types'

export interface WeightedMultiplier {
  readonly multiplier: number
  readonly weight: number
}

export interface FreeSpinRules {
  readonly strips: ReelStrips
  readonly paytable: Paytable
  /** Weighted table each free-spin WILD's multiplier is drawn from. */
  readonly wildMultiplierWeights: readonly WeightedMultiplier[]
  /** Spins added when 3+ chests land during the feature. */
  readonly retriggerSpins: number
  /** Most free spins one feature can award in total (retriggers past it are trimmed). */
  readonly maxSpins: number
  /** Cap on base spin + whole feature, in coins. */
  readonly winCapCoins: number
  readonly rows: number
}

/** Draw one multiplier from a weighted table using integer weights (no floats). */
export function drawWeighted(rng: Rng, table: readonly WeightedMultiplier[]): number {
  let total = 0
  for (const e of table) {
    if (!Number.isInteger(e.weight) || e.weight < 0) throw new Error(`drawWeighted: bad weight ${e.weight}`)
    total += e.weight
  }
  if (total <= 0) throw new Error('drawWeighted: weights sum to zero')
  let r = rng.nextInt(total)
  for (const e of table) {
    if (r < e.weight) return e.multiplier
    r -= e.weight
  }
  /* c8 ignore next */
  throw new Error('drawWeighted: unreachable')
}

/** Draw a multiplier for every WILD on the grid (0 for every other cell). */
export function drawWildMultipliers(
  rng: Rng,
  grid: Grid,
  table: readonly WeightedMultiplier[],
): WildMultipliers {
  return grid.map((window) => window.map((s) => (s === 'WILD' ? drawWeighted(rng, table) : 0)))
}

/** Ways + scatter evaluation of one free-spin grid with its wild multipliers (no cap). */
export function evaluateFreeSpinGrid(grid: Grid, wildMultipliers: WildMultipliers, paytable: Paytable) {
  const wayWins = evaluateWays(grid, paytable, wildMultipliers)
  const scatterWin = evaluateScatter(grid, paytable)
  let coins = scatterWin ? scatterWin.coins : 0
  for (const w of wayWins) coins += w.coins
  return { wayWins, scatterWin, coins }
}

/**
 * Play a whole feature.
 *
 * @param initialSpins free spins awarded by the triggering base spin
 * @param baseCoins    coins already won by the base spin (counts toward the cap)
 */
export function playFeature(
  rng: Rng,
  rules: FreeSpinRules,
  initialSpins: number,
  baseCoins: number,
): FeatureResult {
  const cap = rules.winCapCoins
  const initial = Math.min(initialSpins, rules.maxSpins)
  let awarded = initial
  let remaining = initial
  let retriggers = 0
  let running = Math.min(baseCoins, cap)
  let featureCoins = 0
  let endedByCap = running >= cap
  const spins: FreeSpinResult[] = []

  while (remaining > 0 && !endedByCap) {
    remaining--
    const stops = rules.strips.map((strip) => rng.nextInt(strip.length))
    const grid = gridFromStops(rules.strips, stops, rules.rows)
    const wildMultipliers = drawWildMultipliers(rng, grid, rules.wildMultiplierWeights)
    const { wayWins, scatterWin, coins: uncappedCoins } = evaluateFreeSpinGrid(grid, wildMultipliers, rules.paytable)

    // Running cap: pay only up to the cap, then the feature ends.
    const coins = Math.min(uncappedCoins, cap - running)
    running += coins
    featureCoins += coins
    const capped = running >= cap
    endedByCap = capped

    // Retrigger: 3+ chests add a fixed number of spins, trimmed to the feature limit.
    let retriggerSpins = 0
    if (!capped && scatterWin && scatterWin.freeSpinsAwarded > 0) {
      retriggerSpins = Math.min(rules.retriggerSpins, rules.maxSpins - awarded)
      if (retriggerSpins > 0) {
        awarded += retriggerSpins
        remaining += retriggerSpins
        retriggers++
      }
    }

    spins.push({
      index: spins.length + 1,
      stops,
      grid,
      wildMultipliers,
      wayWins,
      scatterWin,
      uncappedCoins,
      coins,
      retriggerSpins,
      spinsRemaining: capped ? 0 : remaining,
      runningTotalCoins: running,
      capped,
    })
  }

  return {
    initialSpins: initial,
    totalSpinsAwarded: awarded,
    retriggers,
    spins,
    totalCoins: featureCoins,
    endedByCap,
  }
}
