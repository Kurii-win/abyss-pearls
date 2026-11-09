/**
 * Seeded full-game simulation: N paid spins, each with its whole feature, through the
 * same `spin()` the game uses. Produces every number reports/rtp-report.json carries.
 * Shared by tools/sim/runSim.ts (10M spins) and tests/sim/feature.sim.test.ts (1M).
 */
import { computeBaseHitFrequency, computeBaseRtp } from '../../src/models/exactRtp'
import { MATH_VERSION_LABEL, mathHash } from '../../src/models/mathVersion'
import { computeCodeHash, RULE_SOURCE_FILES } from './codeHash'
import { playFeature } from '../../src/models/freeSpins'
import { REELS, scatterEntry } from '../../src/models/paytable'
import { createSeededRng } from '../../src/models/rng'
import { GAME_MATH, spin, type GameMath } from '../../src/models/spin'

export const REPORT_SCHEMA_VERSION = 2
export const RTP_TARGET = 0.96
export const RTP_BAND = { low: 0.955, high: 0.965 } as const

/**
 * Settings of the official `npm run sim` run that writes reports/rtp-report.json.
 * Any override (SIM_SEED / SIM_SPINS / SIM_FEATURES_PER_STRATUM) makes it an
 * experiment, written to reports/rtp-report.experiment.json instead.
 */
export const OFFICIAL_SIM = {
  seed: 20261109,
  spins: 10_000_000,
  /** The stratified feature sim uses its own stream so it is independent of the plain sim. */
  stratifiedSeed: 20261110,
  featuresPerStratum: 500_000,
} as const

export const HEADLINE_METHOD = 'exact base + stratified feature'
export const PLAIN_SIM_METHOD = 'full-game simulation'

/** Win-size buckets in multiples of total bet: [minX, maxX), except the exact-zero bucket. */
export const WIN_BUCKETS = [
  { label: '0×', minX: 0, maxX: 0 },
  { label: '>0–1×', minX: 0, maxX: 1 },
  { label: '1–2×', minX: 1, maxX: 2 },
  { label: '2–5×', minX: 2, maxX: 5 },
  { label: '5–20×', minX: 5, maxX: 20 },
  { label: '20–100×', minX: 20, maxX: 100 },
  { label: '100–1000×', minX: 100, maxX: 1000 },
  { label: '1000×+', minX: 1000, maxX: null },
] as const

function bucketIndex(x: number): number {
  if (x === 0) return 0
  for (let i = 1; i < WIN_BUCKETS.length; i++) {
    const max = WIN_BUCKETS[i].maxX
    if (max === null || x < max) return i
  }
  return WIN_BUCKETS.length - 1
}

export interface SimStats {
  spins: number
  /** Sum of total win / bet over all spins. */
  sumX: number
  sumSqX: number
  baseSumX: number
  featureSumX: number
  hits: number
  features: number
  freeSpinsPlayed: number
  freeSpinsAwarded: number
  featuresWithRetrigger: number
  retriggers: number
  featuresAtSpinLimit: number
  capHits: number
  maxX: number
  bucketCounts: number[]
}

export function simulate(seed: number, spins: number, math: GameMath = GAME_MATH): SimStats {
  const rng = createSeededRng(seed)
  const bet = math.basePaytable.coinsPerBet
  const s: SimStats = {
    spins,
    sumX: 0,
    sumSqX: 0,
    baseSumX: 0,
    featureSumX: 0,
    hits: 0,
    features: 0,
    freeSpinsPlayed: 0,
    freeSpinsAwarded: 0,
    featuresWithRetrigger: 0,
    retriggers: 0,
    featuresAtSpinLimit: 0,
    capHits: 0,
    maxX: 0,
    bucketCounts: new Array<number>(WIN_BUCKETS.length).fill(0),
  }
  for (let i = 0; i < spins; i++) {
    const r = spin(rng, math)
    const x = r.totalCoins / bet
    s.sumX += x
    s.sumSqX += x * x
    s.baseSumX += r.baseCoins / bet
    if (r.totalCoins > 0) s.hits++
    if (x > s.maxX) s.maxX = x
    if (r.capped) s.capHits++
    s.bucketCounts[bucketIndex(x)]++
    const f = r.feature
    if (f) {
      s.features++
      s.featureSumX += f.totalCoins / bet
      s.freeSpinsPlayed += f.spins.length
      s.freeSpinsAwarded += f.totalSpinsAwarded
      s.retriggers += f.retriggers
      if (f.retriggers > 0) s.featuresWithRetrigger++
      if (f.totalSpinsAwarded >= math.freeSpins.maxSpins) s.featuresAtSpinLimit++
    }
  }
  return s
}

/**
 * Stratified feature estimate (variance reduction). For each chest count n that
 * triggers, play `featuresPerStratum` features directly and weight their mean win by
 * the EXACT P(n chests) from computeBaseRtp:
 *
 *   featureRtp = Σ_n P(n) · E[feature win | n] / bet
 *
 * Far tighter than the full-spin sim for the same work, because no time is spent on
 * the ~99% of spins that don't trigger. Cap: each feature starts from the base spin's
 * scatter pay only (the base ways win is ignored for the cap; the cap is reached so
 * rarely that this cannot move the estimate measurably).
 */
export function simulateFeatureStratified(seed: number, featuresPerStratum: number, math: GameMath = GAME_MATH) {
  const exact = computeBaseRtp(math.baseStrips, math.basePaytable, math.rows)
  const rng = createSeededRng(seed)
  const bet = math.basePaytable.coinsPerBet
  const scatter = math.basePaytable.scatter
  const rules = { ...math.freeSpins, winCapCoins: math.winCapCoins }
  let rtp = 0
  let variance = 0
  const strata: { chests: number; probability: number; freeSpins: number; meanWinX: number; sigmaX: number }[] = []
  exact.chestCountProbabilities.forEach((p, n) => {
    const spins = scatterEntry(scatter.freeSpins, n)
    if (spins === 0 || p === 0) return
    const baseCoins = scatterEntry(scatter.betMultipliers, n) * bet
    let sum = 0
    let sumSq = 0
    for (let i = 0; i < featuresPerStratum; i++) {
      const x = playFeature(rng, rules, spins, baseCoins).totalCoins / bet
      sum += x
      sumSq += x * x
    }
    const mean = sum / featuresPerStratum
    const sd = Math.sqrt(Math.max(sumSq / featuresPerStratum - mean * mean, 0))
    rtp += p * mean
    variance += (p * p * sd * sd) / featuresPerStratum
    strata.push({ chests: n, probability: p, freeSpins: spins, meanWinX: mean, sigmaX: sd })
  })
  const stdErr = Math.sqrt(variance)
  return { seed, featuresPerStratum, rtp, stdErr, ci95Low: rtp - 1.96 * stdErr, ci95High: rtp + 1.96 * stdErr, strata }
}

export type StratifiedFeature = ReturnType<typeof simulateFeatureStratified>

export function meanAndSigma(s: SimStats): { mean: number; sigma: number; stdErr: number } {
  const mean = s.sumX / s.spins
  const sigma = Math.sqrt(Math.max(s.sumSqX / s.spins - mean * mean, 0))
  return { mean, sigma, stdErr: sigma / Math.sqrt(s.spins) }
}

export interface BuildReportInput {
  stats: SimStats
  /** Seed of the plain full-game sim. */
  seed: number
  /** Result of simulateFeatureStratified; its own seed is stored in the report. */
  stratified: StratifiedFeature
  runtimeSeconds: number
  math?: GameMath
  generatedAt?: string
  /** Hash of the rule source files; defaults to reading them from disk. */
  codeHash?: string
}

/**
 * Build the JSON report the Math & Fairness page reads.
 *
 * `rtp.headline` is THE number to show: exact base RTP + stratified feature estimate,
 * with a 95% CI (the base part is exact, so its CI is the feature's CI shifted).
 * `rtp.plainSim` is the independent full-game simulation, kept as a cross-check.
 */
export function buildReport({
  stats: s,
  seed,
  stratified,
  runtimeSeconds,
  math = GAME_MATH,
  generatedAt = new Date().toISOString(),
  codeHash = computeCodeHash(),
}: BuildReportInput) {
  const exact = computeBaseRtp(math.baseStrips, math.basePaytable, math.rows)
  const exactHit = computeBaseHitFrequency(math.baseStrips, math.basePaytable, math.rows)
  const { mean, sigma, stdErr } = meanAndSigma(s)
  const bet = math.basePaytable.coinsPerBet
  const scatter = math.basePaytable.scatter
  const headline = exact.rtp + stratified.rtp

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt,
    runtimeSeconds,
    seed,
    rng: 'xoshiro128** seeded via splitmix32, rejection sampling',
    spins: s.spins,
    math: {
      version: MATH_VERSION_LABEL,
      /** Data fingerprint: strips, paytable, feature settings, cap. */
      mathHash: mathHash(math),
      /** Rule-code fingerprint: source text of `codeFiles`. */
      codeHash,
      codeFiles: [...RULE_SOURCE_FILES],
    },
    game: {
      grid: `${REELS}x${math.rows}`,
      reels: REELS,
      rows: math.rows,
      ways: math.rows ** REELS,
      coinsPerBet: bet,
      winCapX: math.winCapCoins / bet,
      freeSpinsByChests: { 3: scatter.freeSpins[3], 4: scatter.freeSpins[4], 5: scatter.freeSpins[5] },
      retriggerSpins: math.freeSpins.retriggerSpins,
      maxFreeSpins: math.freeSpins.maxSpins,
      wildMultiplierWeights: math.freeSpins.wildMultiplierWeights,
    },
    target: { rtp: RTP_TARGET, bandLow: RTP_BAND.low, bandHigh: RTP_BAND.high },
    rtp: {
      /** The published RTP: exact base + stratified feature, with its 95% CI. */
      headline: {
        value: headline,
        ci95Low: exact.rtp + stratified.ci95Low,
        ci95High: exact.rtp + stratified.ci95High,
        standardError: stratified.stdErr,
        method: HEADLINE_METHOD,
      },
      /** Independent check: plain full-game simulation (base + feature) and its 95% CI. */
      plainSim: {
        value: mean,
        ci95Low: mean - 1.96 * stdErr,
        ci95High: mean + 1.96 * stdErr,
        standardError: stdErr,
        method: PLAIN_SIM_METHOD,
      },
      /** Exact base-game RTP (ways + scatter pays), from per-reel independence. */
      baseExact: exact.rtp,
      /** Base-game part of the plain sim (diagnostic; compare with baseExact). */
      baseSim: s.baseSumX / s.spins,
      /** Feature part of the plain sim (diagnostic). */
      featureSim: s.featureSumX / s.spins,
      /** Stratified feature estimate behind the headline. */
      stratifiedFeature: {
        seed: stratified.seed,
        featuresPerStratum: stratified.featuresPerStratum,
        value: stratified.rtp,
        ci95Low: stratified.ci95Low,
        ci95High: stratified.ci95High,
        standardError: stratified.stdErr,
        strata: stratified.strata,
      },
      /** Base-game scatter pays only (exact). */
      scatter: exact.scatterRtp,
      baseWays: exact.baseLineRtp,
    },
    hitFrequency: s.hits / s.spins,
    hitFrequencyExact: exactHit.hitFrequency,
    sigmaPerSpinX: sigma,
    featureTriggerOneIn: s.features > 0 ? s.spins / s.features : null,
    featureTriggerOneInExact: 1 / exact.featureTriggerProbability,
    features: s.features,
    avgFeatureWinX: s.features > 0 ? s.featureSumX / s.features : null,
    avgFreeSpinsPerFeature: s.features > 0 ? s.freeSpinsPlayed / s.features : null,
    /** Fraction of features with at least one retrigger. */
    retriggerRate: s.features > 0 ? s.featuresWithRetrigger / s.features : null,
    retriggersPerFeature: s.features > 0 ? s.retriggers / s.features : null,
    featuresAtSpinLimit: s.featuresAtSpinLimit,
    capHits: s.capHits,
    capHitRate: s.capHits / s.spins,
    maxWinX: s.maxX,
    winDistribution: WIN_BUCKETS.map((b, i) => ({
      label: b.label,
      minX: b.minX,
      maxX: b.maxX,
      count: s.bucketCounts[i],
      fraction: s.bucketCounts[i] / s.spins,
    })),
  }
}

export type RtpReport = ReturnType<typeof buildReport>
