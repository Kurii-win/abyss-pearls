/** SpinResults for controller tests: real seeded spins plus hand-built edge cases. */
import { createSeededRng } from '../../src/models/rng'
import { spin } from '../../src/models/spin'
import type { FeatureResult, FreeSpinResult, SpinResult } from '../../src/models/types'

export function seededSpin(seed: number): SpinResult {
  return spin(createSeededRng(seed))
}

/** First spin of seed 1: no win, no feature. */
export const NO_WIN = seededSpin(1)
/** First spin of seed 11: a base win (50 coins), no feature. */
export const BASE_WIN = seededSpin(11)
/** First spin of seed 669: a big base win (≥ 20× bet). */
export const BIG_WIN = seededSpin(669)
/** First spin of seed 219: triggers an 8-spin feature. */
export const FEATURE = seededSpin(219)

/** A feature whose 2nd free spin hits the win cap (hand-built; wayWins sum > paid coins). */
export function cappedFeatureResult(): SpinResult {
  const base = FEATURE
  const template = base.feature!.spins[0]
  const capCoins = 125_000
  const first: FreeSpinResult = { ...template, index: 1, coins: 1_000, uncappedCoins: 1_000, retriggerSpins: 0, spinsRemaining: 7, runningTotalCoins: base.baseCoins + 1_000, capped: false }
  const second: FreeSpinResult = {
    ...template,
    index: 2,
    uncappedCoins: 200_000,
    coins: capCoins - base.baseCoins - 1_000,
    retriggerSpins: 0,
    spinsRemaining: 0,
    runningTotalCoins: capCoins,
    capped: true,
  }
  const feature: FeatureResult = {
    initialSpins: 8,
    totalSpinsAwarded: 8,
    retriggers: 0,
    spins: [first, second],
    totalCoins: capCoins - base.baseCoins,
    endedByCap: true,
  }
  return { ...base, feature, totalCoins: capCoins, capped: true }
}

/** First spin of seed 6468: 8 free spins, retrigger +5 on free spin 2 (13 played). */
export const RETRIGGER = seededSpin(6468)
