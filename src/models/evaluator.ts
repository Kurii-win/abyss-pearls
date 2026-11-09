/**
 * 243-ways evaluation (generic over the number of rows) and scatter evaluation.
 * All arithmetic is in integer coins.
 */
import { scatterEntry, waySymbols, waysPay, type Paytable } from './paytable'
import type {
  Grid,
  ReelStrips,
  ReelWindow,
  ScatterWin,
  SymbolId,
  WayWin,
  WaySymbol,
  WildMultipliers,
} from './types'

/**
 * The visible grid for the given stops. Each stop is the strip index shown in the
 * top row; the window wraps around past the end of the strip.
 */
export function gridFromStops(strips: ReelStrips, stops: readonly number[], rows: number): Grid {
  if (stops.length !== strips.length) {
    throw new Error(`gridFromStops: ${stops.length} stops for ${strips.length} reels`)
  }
  return strips.map((strip, reel) => {
    const stop = stops[reel]
    if (!Number.isInteger(stop) || stop < 0 || stop >= strip.length) {
      throw new RangeError(`gridFromStops: stop ${stop} out of range for reel ${reel + 1}`)
    }
    const window: SymbolId[] = []
    for (let row = 0; row < rows; row++) window.push(strip[(stop + row) % strip.length])
    return window
  })
}

/** Positions on one reel that count for `symbol` (the symbol itself or a WILD). */
export function countMatches(window: ReelWindow, symbol: WaySymbol): number {
  let n = 0
  for (const s of window) if (s === symbol || s === 'WILD') n++
  return n
}

/**
 * Wilds only appear on reels 2–4, so every way starts on a real symbol. If a wild
 * ever reached reel 1, an all-wild path would be counted once for every symbol,
 * which the spec does not define. Fail loudly instead of paying something undefined.
 */
export function assertNoWildOnFirstReel(firstReel: ReelWindow | readonly SymbolId[]): void {
  if (firstReel.includes('WILD')) {
    throw new Error('evaluateWays: WILD on reel 1 is not allowed (wild-only ways are undefined)')
  }
}

/**
 * Check a wild-multiplier grid against its symbol grid: same shape, every WILD has a
 * multiplier >= 1, every other cell has 0.
 */
export function assertWildMultipliers(grid: Grid, wildMultipliers: WildMultipliers): void {
  if (wildMultipliers.length !== grid.length) {
    throw new Error('evaluateWays: wildMultipliers must have one column per reel')
  }
  grid.forEach((window, reel) => {
    const mults = wildMultipliers[reel]
    if (mults.length !== window.length) {
      throw new Error(`evaluateWays: wildMultipliers reel ${reel + 1} has the wrong number of rows`)
    }
    window.forEach((s, row) => {
      const m = mults[row]
      const ok = s === 'WILD' ? Number.isInteger(m) && m >= 1 : m === 0
      if (!ok) throw new Error(`evaluateWays: bad wild multiplier ${m} at reel ${reel + 1}, row ${row + 1}`)
    })
  })
}

/**
 * For each way symbol: count matches (symbol or WILD) per reel from reel 1, stopping
 * at the first reel with none. Pays if the length has a non-zero pay; ways = product
 * of the per-reel counts. WILD never stands in for CHEST (CHEST is not a way symbol).
 *
 * Wild multipliers (free spins only): a way's multiplier is the SUM of the multipliers
 * of the wilds it passes through, or ×1 if it passes through none. Summed over every
 * way of a symbol (paying reels i = 1..k):
 *
 *   multipliedWays = Π n_i  +  Σ_i W_i · Π_{j≠i} c_j
 *
 * n_i = natural (non-wild) matches on reel i, c_i = all matches on reel i, W_i = sum of
 * the multipliers of the wilds on reel i. The first term counts the wild-free ways at
 * ×1. For the second, a way's multiplier is a sum over its wild cells, so swap the
 * order: each wild cell on reel i (multiplier m) lies on Π_{j≠i} c_j ways and adds m
 * to each. Ways through two wilds therefore get m1 + m2, exactly the rule.
 * tests/unit/wildMultipliers.test.ts checks this against brute-force path enumeration.
 *
 * With no multipliers (base game) multipliedWays === ways, so base-game wins are
 * unchanged.
 */
export function evaluateWays(
  grid: Grid,
  paytable: Paytable,
  wildMultipliers: WildMultipliers | null = null,
): WayWin[] {
  if (grid.length === 0) return []
  assertNoWildOnFirstReel(grid[0])
  if (wildMultipliers) assertWildMultipliers(grid, wildMultipliers)

  const wins: WayWin[] = []
  for (const symbol of waySymbols(paytable)) {
    const matchesPerReel: number[] = []
    for (const window of grid) {
      const n = countMatches(window, symbol)
      if (n === 0) break
      matchesPerReel.push(n)
    }
    const reels = matchesPerReel.length
    const coinsPerWay = waysPay(paytable, symbol, reels)
    if (coinsPerWay === 0) continue
    const ways = matchesPerReel.reduce((a, b) => a * b, 1)
    const multipliedWays = wildMultipliers
      ? multipliedWaysFor(grid, wildMultipliers, symbol, matchesPerReel)
      : ways
    wins.push({
      symbol,
      reels,
      matchesPerReel,
      ways,
      coinsPerWay,
      multipliedWays,
      coins: multipliedWays * coinsPerWay,
    })
  }
  return wins
}

/** Closed form Π n_i + Σ_i W_i · Π_{j≠i} c_j over the paying reels (see evaluateWays). */
function multipliedWaysFor(
  grid: Grid,
  wildMultipliers: WildMultipliers,
  symbol: WaySymbol,
  matchesPerReel: readonly number[],
): number {
  let naturalProduct = 1
  let wildTerm = 0
  for (let i = 0; i < matchesPerReel.length; i++) {
    let natural = 0
    let wildSum = 0
    grid[i].forEach((s, row) => {
      if (s === symbol) natural++
      else if (s === 'WILD') wildSum += wildMultipliers[i][row]
    })
    naturalProduct *= natural
    if (wildSum === 0) continue
    let others = 1
    for (let j = 0; j < matchesPerReel.length; j++) if (j !== i) others *= matchesPerReel[j]
    wildTerm += wildSum * others
  }
  return naturalProduct + wildTerm
}

/** Count CHESTs anywhere on the grid. */
export function countScatters(grid: Grid, paytable: Paytable): number {
  let n = 0
  for (const window of grid) for (const s of window) if (s === paytable.scatter.symbol) n++
  return n
}

/**
 * Scatter pays anywhere, × total bet, and reports the free spins awarded.
 * Returns null when the chest count neither pays nor triggers.
 */
export function evaluateScatter(grid: Grid, paytable: Paytable): ScatterWin | null {
  const count = countScatters(grid, paytable)
  const betMultiplier = scatterEntry(paytable.scatter.betMultipliers, count)
  const freeSpinsAwarded = scatterEntry(paytable.scatter.freeSpins, count)
  if (betMultiplier === 0 && freeSpinsAwarded === 0) return null
  return {
    symbol: paytable.scatter.symbol,
    count,
    betMultiplier,
    coins: betMultiplier * paytable.coinsPerBet,
    freeSpinsAwarded,
  }
}
