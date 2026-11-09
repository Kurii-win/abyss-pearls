/**
 * Paytable v1, tuned in M1 pass 2 (docs/MATH.md §3, §4).
 * All values are integers in coins; total bet is COINS_PER_BET coins.
 */
import type { WaySymbol } from './types'

export const REELS = 5
export const ROWS = 3
export const COINS_PER_BET = 25

/** Hard win cap: 5,000 × total bet (docs/MATH.md §1). */
export const WIN_CAP_COINS = 5_000 * COINS_PER_BET

/**
 * Pays indexed by length: pays[k] = coins per way for a k-reel match.
 * Index 0..REELS; 0 means "does not pay".
 */
export type PaysByLength = readonly number[]

export interface ScatterPays {
  readonly symbol: 'CHEST'
  /** betMultipliers[n] = × total bet for n chests anywhere. */
  readonly betMultipliers: readonly number[]
  /** freeSpins[n] = free spins awarded for n chests anywhere. */
  readonly freeSpins: readonly number[]
}

export interface Paytable {
  readonly ways: Readonly<Record<WaySymbol, PaysByLength>>
  readonly scatter: ScatterPays
  readonly coinsPerBet: number
}

export const BASE_PAYTABLE: Paytable = {
  ways: {
    //          0  1   2    3    4    5
    WHALE:    [0, 0, 40, 150, 300, 500],
    SHARK:    [0, 0, 15,  75, 180, 300],
    OCTOPUS:  [0, 0, 15,  60, 150, 250],
    TURTLE:   [0, 0,  0,  20,  60, 150],
    ANGLER:   [0, 0,  0,  15,  50, 125],
    PEARL:    [0, 0,  0,   5,  20,  80],
    SHELL:    [0, 0,  0,   4,  15,  60],
    STARFISH: [0, 0,  0,   4,  10,  40],
    ANCHOR:   [0, 0,  0,   3,  10,  40],
  },
  scatter: {
    symbol: 'CHEST',
    //               0  1  2  3   4   5
    betMultipliers: [0, 0, 0, 2, 10, 50],
    freeSpins:      [0, 0, 0, 8, 12, 20],
  },
  coinsPerBet: COINS_PER_BET,
}

/**
 * Free spins: weights for the multiplier each WILD gets when it lands
 * (docs/MATH.md §4). Integer weights; P(×m) = weight / total.
 */
export const WILD_MULTIPLIER_WEIGHTS: readonly { readonly multiplier: number; readonly weight: number }[] = [
  { multiplier: 2, weight: 7 },
  { multiplier: 3, weight: 3 },
]

/** Spins added by 3+ chests during free spins. */
export const RETRIGGER_SPINS = 5

/** Most free spins one feature can award in total. */
export const MAX_FREE_SPINS = 50

/** Ways symbols in paytable order (highest first). */
export function waySymbols(paytable: Paytable): WaySymbol[] {
  return Object.keys(paytable.ways) as WaySymbol[]
}

/** Coins per way for `length` reels; 0 if that length does not pay. */
export function waysPay(paytable: Paytable, symbol: WaySymbol, length: number): number {
  return paytable.ways[symbol][length] ?? 0
}

/**
 * Look up a scatter table entry for `count` chests.
 *
 * Clamp: counts beyond the table (6+ chests on a 5-reel table) use the LAST entry, i.e.
 * they pay and award exactly what 5 chests do. Real strips space chests at least ROWS
 * apart, so at most one chest shows per reel and 6+ is impossible in play; the clamp
 * only matters for hand-built grids and dense test strips, and it guarantees that more
 * chests never pay less than fewer.
 */
export function scatterEntry(table: readonly number[], count: number): number {
  if (count <= 0 || table.length === 0) return 0
  return table[Math.min(count, table.length - 1)]
}
