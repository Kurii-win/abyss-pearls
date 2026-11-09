/**
 * Exact base-game RTP from per-reel independence (no simulation).
 *
 * Each reel's stop is chosen independently and uniformly, so for a symbol s:
 *   total coins over all stop combinations for an exactly-k-reel win
 *     = pay[s][k] × Π_{i<k} M_i × Z_k × Π_{j>k} L_j
 * where M_i = Σ over reel i's stops of the match count (symbol or WILD),
 *       Z_k = number of stops on reel k with zero matches (omitted when k = REELS),
 *       L_j = strip length (reels after the break are free).
 * Dividing by Π L gives pay × Π E[c_i] × P(c_k = 0), the formula in docs/MATH.md.
 *
 * Everything is kept as BigInt sums over all stop combinations, so the result is an
 * exact rational (coins / combinations) and can be compared with brute force exactly.
 *
 * The win cap is ignored here: a base spin alone cannot reach it (bound in spin.ts).
 */
import { assertNoWildOnFirstReel, countMatches } from './evaluator'
import { ROWS, scatterEntry, waySymbols, waysPay, type Paytable } from './paytable'
import type { ReelStrip, ReelStrips, SymbolId, WaySymbol } from './types'

export interface BaseRtpReport {
  /** Number of equally likely stop combinations (Π strip lengths). */
  readonly combinations: bigint
  /** Sum of ways-pay coins over every stop combination. */
  readonly waysCoinsTotal: bigint
  /** Sum of scatter-pay coins over every stop combination. */
  readonly scatterCoinsTotal: bigint
  /** Combinations that award free spins. */
  readonly featureTriggerCombinations: bigint
  /** Total base-game RTP (ways + scatter pays; excludes the free-spin feature). */
  readonly rtp: number
  /** RTP from ways pays only. */
  readonly baseLineRtp: number
  /** RTP from the scatter pay only (not the free spins it triggers). */
  readonly scatterRtp: number
  /** Ways RTP contributed by each symbol. */
  readonly waysRtpBySymbol: Readonly<Record<WaySymbol, number>>
  /** P(free spins awarded on a base spin). */
  readonly featureTriggerProbability: number
  /** chestCountProbabilities[n] = P(exactly n chests visible). */
  readonly chestCountProbabilities: readonly number[]
}

function windowAt(strip: ReelStrip, stop: number, rows: number): SymbolId[] {
  const w: SymbolId[] = []
  for (let r = 0; r < rows; r++) w.push(strip[(stop + r) % strip.length])
  return w
}

/** Over all stops of one reel: total matches (M) and stops with zero matches (Z). */
function matchStats(strip: ReelStrip, symbol: WaySymbol, rows: number): { m: bigint; z: bigint } {
  let m = 0
  let z = 0
  for (let stop = 0; stop < strip.length; stop++) {
    const c = countMatches(windowAt(strip, stop, rows), symbol)
    m += c
    if (c === 0) z++
  }
  return { m: BigInt(m), z: BigInt(z) }
}

/** stopsWithCount[c] = number of stops on this reel showing exactly c chests. */
function chestCountsPerReel(strip: ReelStrip, chest: SymbolId, rows: number): bigint[] {
  const counts = new Array<bigint>(rows + 1).fill(0n)
  for (let stop = 0; stop < strip.length; stop++) {
    const c = windowAt(strip, stop, rows).filter((s) => s === chest).length
    counts[c] += 1n
  }
  return counts
}

function convolve(a: readonly bigint[], b: readonly bigint[]): bigint[] {
  const out = new Array<bigint>(a.length + b.length - 1).fill(0n)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j]
  return out
}

function ratio(num: bigint, den: bigint): number {
  return Number(num) / Number(den)
}

export function computeBaseRtp(strips: ReelStrips, paytable: Paytable, rows: number = ROWS): BaseRtpReport {
  if (strips.length === 0) throw new Error('computeBaseRtp: no reels')
  assertNoWildOnFirstReel(strips[0])

  const reels = strips.length
  const lengths = strips.map((s) => BigInt(s.length))
  const combinations = lengths.reduce((a, b) => a * b, 1n)
  const coinsPerBet = BigInt(paytable.coinsPerBet)
  const betTotal = combinations * coinsPerBet

  // Ways pays.
  let waysCoinsTotal = 0n
  const waysRtpBySymbol = {} as Record<WaySymbol, number>
  for (const symbol of waySymbols(paytable)) {
    const stats = strips.map((strip) => matchStats(strip, symbol, rows))
    let symbolTotal = 0n
    let prefix = 1n // Π_{i<k} M_i
    for (let k = 1; k <= reels; k++) {
      prefix *= stats[k - 1].m
      const pay = waysPay(paytable, symbol, k)
      if (pay === 0) continue
      let rest = 1n
      if (k < reels) {
        rest = stats[k].z
        for (let j = k + 1; j < reels; j++) rest *= lengths[j]
      }
      symbolTotal += BigInt(pay) * prefix * rest
    }
    waysRtpBySymbol[symbol] = ratio(symbolTotal, betTotal)
    waysCoinsTotal += symbolTotal
  }

  // Scatter pays: exact distribution of the chest count by convolution over reels.
  const chest = paytable.scatter.symbol
  let chestDist: bigint[] = [1n]
  for (const strip of strips) chestDist = convolve(chestDist, chestCountsPerReel(strip, chest, rows))

  let scatterCoinsTotal = 0n
  let featureTriggerCombinations = 0n
  chestDist.forEach((combos, n) => {
    scatterCoinsTotal += combos * BigInt(scatterEntry(paytable.scatter.betMultipliers, n)) * coinsPerBet
    if (scatterEntry(paytable.scatter.freeSpins, n) > 0) featureTriggerCombinations += combos
  })

  return {
    combinations,
    waysCoinsTotal,
    scatterCoinsTotal,
    featureTriggerCombinations,
    rtp: ratio(waysCoinsTotal + scatterCoinsTotal, betTotal),
    baseLineRtp: ratio(waysCoinsTotal, betTotal),
    scatterRtp: ratio(scatterCoinsTotal, betTotal),
    waysRtpBySymbol,
    featureTriggerProbability: ratio(featureTriggerCombinations, combinations),
    chestCountProbabilities: chestDist.map((c) => ratio(c, combinations)),
  }
}

/**
 * Exact base-game hit frequency: P(the base spin pays anything).
 *
 * Any ways win needs a symbol on reels 1..m, where m is that symbol's shortest paying
 * length, so only the first K = max(m) reels decide ways hits. Enumerate every stop
 * combination of those K reels; if none pays on ways, the spin still hits when the
 * chests on those reels plus the chests on the remaining reels reach the smallest
 * paying/triggering chest count. The remaining reels enter through their exact
 * chest-count distribution (convolution), so the result is an exact rational.
 *
 * A triggered feature always pays its scatter, so this is also the hit frequency of a
 * full spin including its feature.
 */
export function computeBaseHitFrequency(
  strips: ReelStrips,
  paytable: Paytable,
  rows: number = ROWS,
): { hitCombinations: bigint; combinations: bigint; hitFrequency: number } {
  assertNoWildOnFirstReel(strips[0])
  const symbols = waySymbols(paytable)
  const minLength = symbols.map((s) => {
    const k = paytable.ways[s].findIndex((pay, len) => len >= 1 && pay > 0)
    return k < 0 ? Infinity : k
  })
  const finite = minLength.filter((k) => Number.isFinite(k))
  const K = Math.min(strips.length, finite.length > 0 ? Math.max(...finite) : 0)
  const chest = paytable.scatter.symbol

  let minChests = Infinity
  for (let n = 1; n <= strips.length * rows; n++) {
    if (scatterEntry(paytable.scatter.betMultipliers, n) > 0 || scatterEntry(paytable.scatter.freeSpins, n) > 0) {
      minChests = n
      break
    }
  }

  // Chest distribution of reels K+1..N, as stop-combination counts.
  let restDist: bigint[] = [1n]
  for (const strip of strips.slice(K)) restDist = convolve(restDist, chestCountsPerReel(strip, chest, rows))
  const restAtLeast = (need: number): bigint => {
    let total = 0n
    restDist.forEach((c, n) => {
      if (n >= Math.max(need, 0)) total += c
    })
    return total
  }
  const restCombos = restDist.reduce((a, b) => a + b, 0n)

  const windows = strips.slice(0, K).map((strip) => Array.from({ length: strip.length }, (_, s) => windowAt(strip, s, rows)))
  let hits = 0n
  const chosen: SymbolId[][] = []
  const visit = (reel: number): void => {
    if (reel === K) {
      const waysHit = symbols.some((symbol, i) => {
        const m = minLength[i]
        if (!Number.isFinite(m) || m > K) return false
        for (let r = 0; r < m; r++) if (countMatches(chosen[r], symbol) === 0) return false
        return true
      })
      if (waysHit) {
        hits += restCombos
        return
      }
      let chests = 0
      for (const w of chosen) for (const s of w) if (s === chest) chests++
      if (Number.isFinite(minChests)) hits += restAtLeast(minChests - chests)
      return
    }
    for (const w of windows[reel]) {
      chosen[reel] = w
      visit(reel + 1)
    }
  }
  visit(0)

  const combinations = strips.map((s) => BigInt(s.length)).reduce((a, b) => a * b, 1n)
  return { hitCombinations: hits, combinations, hitFrequency: ratio(hits, combinations) }
}
