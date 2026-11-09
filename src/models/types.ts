/**
 * Core game types. Pure data, no behaviour.
 *
 * A SpinResult holds the whole outcome of one base spin, including every free spin
 * it triggers, so the View can replay it exactly with no randomness left over.
 */

export const SYMBOL_IDS = [
  'WHALE',
  'SHARK',
  'OCTOPUS',
  'TURTLE',
  'ANGLER',
  'PEARL',
  'SHELL',
  'STARFISH',
  'ANCHOR',
  'WILD',
  'CHEST',
] as const

export type SymbolId = (typeof SYMBOL_IDS)[number]

/** Symbols that pay on ways (everything except the wild and the scatter). */
export type WaySymbol = Exclude<SymbolId, 'WILD' | 'CHEST'>

/** One reel strip, read top to bottom; it wraps around at the end. */
export type ReelStrip = readonly SymbolId[]

/** One strip per reel, reel 1 first. */
export type ReelStrips = readonly ReelStrip[]

/** The visible window of one reel, top row first. */
export type ReelWindow = readonly SymbolId[]

/** grid[reel][row]: reels left to right, rows top to bottom. */
export type Grid = readonly ReelWindow[]

/**
 * Per-cell wild multipliers, same shape as Grid: wildMultipliers[reel][row].
 * 0 for every cell that is not a WILD. Only free spins have them; in the base game
 * wilds carry no multiplier and the field is null.
 */
export type WildMultipliers = readonly (readonly number[])[]

/** A ways win for one symbol, counted from reel 1. */
export interface WayWin {
  readonly symbol: WaySymbol
  /** How many consecutive reels (from reel 1) contain the symbol or a wild. */
  readonly reels: number
  /** Matching positions per reel for the paying reels (length === reels). */
  readonly matchesPerReel: readonly number[]
  /** Product of matchesPerReel. */
  readonly ways: number
  /** Paytable value for this symbol and length, in coins. */
  readonly coinsPerWay: number
  /**
   * Σ over every way of its multiplier: a way with no WILD counts ×1, a way through
   * WILDs counts the SUM of their multipliers. Equals `ways` when wilds carry no
   * multiplier (the base game).
   */
  readonly multipliedWays: number
  /** multipliedWays × coinsPerWay. */
  readonly coins: number
}

/** A scatter (Treasure Chest) win; pays anywhere, × total bet. */
export interface ScatterWin {
  readonly symbol: 'CHEST'
  readonly count: number
  /** Multiple of the total bet. */
  readonly betMultiplier: number
  readonly coins: number
  readonly freeSpinsAwarded: number
}

/** One free spin of the feature, fully decided. */
export interface FreeSpinResult {
  /** 1-based position of this free spin within the feature. */
  readonly index: number
  /** Top-row index of the window on each FREE_SPIN_STRIPS reel. */
  readonly stops: readonly number[]
  readonly grid: Grid
  /** Multiplier drawn for every WILD on this grid (0 elsewhere). */
  readonly wildMultipliers: WildMultipliers
  readonly wayWins: readonly WayWin[]
  readonly scatterWin: ScatterWin | null
  /** Ways + scatter coins this spin would pay without the cap. */
  readonly uncappedCoins: number
  /** Coins actually paid by this spin (reduced if it hit the cap). */
  readonly coins: number
  /** Extra free spins added by chests on this spin, after trimming to the limit. */
  readonly retriggerSpins: number
  /** Free spins still to play after this one. */
  readonly spinsRemaining: number
  /** Base spin + feature so far, after the cap. */
  readonly runningTotalCoins: number
  /** True if this spin hit the cap (the feature ends here). */
  readonly capped: boolean
}

/** The whole free-spin feature triggered by one base spin. */
export interface FeatureResult {
  /** Free spins awarded by the triggering base spin. */
  readonly initialSpins: number
  /** Total free spins awarded (initial + retriggers, after the limit). */
  readonly totalSpinsAwarded: number
  /** Number of retriggers that added at least one spin. */
  readonly retriggers: number
  /** Every free spin played, in order. Shorter than totalSpinsAwarded if the cap ended it. */
  readonly spins: readonly FreeSpinResult[]
  /** Coins won across the feature, after the cap. */
  readonly totalCoins: number
  /** True when the win cap ended the feature early. */
  readonly endedByCap: boolean
}

/** Everything that happened in one base-game spin. Decided before any animation. */
export interface SpinResult {
  /** Top-row index of the window on each reel strip. */
  readonly stops: readonly number[]
  readonly grid: Grid
  readonly wayWins: readonly WayWin[]
  readonly scatterWin: ScatterWin | null
  /** Coins paid by the base spin itself (ways + scatter), after the cap. */
  readonly baseCoins: number
  /** Total win in coins: base spin + whole feature, after the win cap. */
  readonly totalCoins: number
  /** True when the win cap reduced the total (base spin or feature). */
  readonly capped: boolean
  /** Free spins triggered by this spin (0 if none). */
  readonly freeSpinsAwarded: number
  /** The feature this spin triggered, already played out; null if none. */
  readonly feature: FeatureResult | null
}
