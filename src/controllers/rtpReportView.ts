/**
 * The Math & Fairness view model. Every number the site shows about RTP, volatility,
 * the feature, the win distribution and reproducibility comes from
 * reports/rtp-report.json (written by `npm run sim`) through this file. Views render
 * the strings below and never compute or type a figure themselves (CLAUDE.md §6).
 *
 * Pure: `buildRtpReportView` takes the parsed report, so tests can feed it variants.
 */
import report from '../../reports/rtp-report.json'

/** The subset of the schemaVersion 2 report this page reads. */
export interface RtpEstimate {
  readonly value: number
  readonly ci95Low: number
  readonly ci95High: number
  readonly standardError: number
  readonly method: string
}

export interface RtpStratum {
  readonly chests: number
  readonly probability: number
  readonly freeSpins: number
  readonly meanWinX: number
  readonly sigmaX: number
}

export interface RtpBucket {
  readonly label: string
  readonly minX: number
  readonly maxX: number | null
  readonly count: number
  readonly fraction: number
}

export interface RtpReportData {
  readonly schemaVersion: number
  readonly generatedAt: string
  readonly runtimeSeconds: number
  readonly seed: number
  readonly rng: string
  readonly spins: number
  readonly math: {
    readonly version: string
    readonly mathHash: string
    readonly codeHash: string
    readonly codeFiles: readonly string[]
  }
  readonly game: {
    readonly ways: number
    readonly coinsPerBet: number
    readonly winCapX: number
  }
  readonly target: { readonly rtp: number; readonly bandLow: number; readonly bandHigh: number }
  readonly rtp: {
    readonly headline: RtpEstimate
    readonly plainSim: RtpEstimate
    readonly baseExact: number
    readonly baseWays: number
    readonly scatter: number
    readonly stratifiedFeature: {
      readonly seed: number
      readonly featuresPerStratum: number
      readonly value: number
      readonly ci95Low: number
      readonly ci95High: number
      readonly standardError: number
      readonly strata: readonly RtpStratum[]
    }
  }
  readonly hitFrequency: number
  readonly hitFrequencyExact: number
  readonly sigmaPerSpinX: number
  readonly featureTriggerOneIn: number | null
  readonly featureTriggerOneInExact: number
  readonly features: number
  readonly avgFeatureWinX: number | null
  readonly avgFreeSpinsPerFeature: number | null
  readonly retriggerRate: number | null
  readonly capHits: number
  readonly maxWinX: number
  readonly winDistribution: readonly RtpBucket[]
}

// ---------------------------------------------------------------- formatting helpers

const MINUS = '−'
const NOT_MEASURED = 'not measured'

/** Fraction → percent string, e.g. 0.96049 → "96.05%". */
export function formatPercent(fraction: number, decimals = 2): string {
  return `${signed((fraction * 100).toFixed(decimals))}%`
}

/** CI bounds → "95.93–96.17%". */
export function formatPercentRange(low: number, high: number, decimals = 2): string {
  return `${signed((low * 100).toFixed(decimals))}–${signed((high * 100).toFixed(decimals))}%`
}

/** Thousands separators, fixed decimals: 2167.6 → "2,167.6". */
export function formatNumber(value: number, decimals = 0): string {
  return signed(
    value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  )
}

/** "1 in N" with N rounded to a whole number: 151.74 → "1 in 152". */
export function formatOneIn(n: number): string {
  return `1 in ${formatNumber(Math.round(n))}`
}

/** A multiple of the total bet: 42.595 → "42.6×". */
export function formatTimesBet(x: number, decimals = 1): string {
  return `${formatNumber(x, decimals)}×`
}

/**
 * A share that can be tiny (win-distribution tail): two decimals at 1% and above,
 * otherwise two significant figures so 0.00026% is not shown as "0.00%".
 */
export function formatShare(fraction: number): string {
  if (fraction === 0) return '0%'
  const pct = fraction * 100
  if (pct >= 1) return `${pct.toFixed(2)}%`
  return `${Number(pct.toPrecision(2)).toLocaleString('en-US', { maximumSignificantDigits: 2, maximumFractionDigits: 20 })}%`
}

/** Use a true minus sign for negatives. */
function signed(text: string): string {
  return text.startsWith('-') ? MINUS + text.slice(1) : text
}

/** ISO timestamp → "2026-11-09 09:22 UTC". */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`
}

// ---------------------------------------------------------------- statistics

/** Two-sided 95% critical value of the standard normal distribution. */
const Z_95 = 1.959963984540054

/**
 * z-score of the difference between two independent estimates. The headline's only
 * random part is the stratified feature sim (its base game is exact) and the plain
 * sim uses a different seed, so the two are independent.
 */
export function zScore(a: number, seA: number, b: number, seB: number): number {
  const se = Math.sqrt(seA * seA + seB * seB)
  return se > 0 ? (a - b) / se : 0
}

/**
 * Volatility label from σ per spin in multiples of total bet. A presentation convention
 * (σ bands commonly used to describe video slots), not a game number; only the label
 * is shown, the σ shown next to it comes from the report.
 */
export function volatilityLabel(sigmaX: number): string {
  if (sigmaX < 3) return 'Low'
  if (sigmaX < 6) return 'Medium'
  if (sigmaX < 10) return 'Medium-high'
  if (sigmaX < 15) return 'High'
  return 'Very high'
}

// ---------------------------------------------------------------- view model

export interface StatItem {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly detail?: string
}

export interface DistributionBar {
  readonly label: string
  readonly count: string
  /** Share as text, e.g. "18.25%". */
  readonly share: string
  /** "1 in N" for this bucket. */
  readonly oneIn: string
  /** Bar length relative to the largest bar in its panel, 0..1. */
  readonly relative: number
}

export interface DistributionPanel {
  readonly id: string
  readonly title: string
  readonly caption: string
  readonly bars: readonly DistributionBar[]
}

export interface StratumRow {
  readonly chests: string
  readonly chance: string
  readonly freeSpins: string
  readonly meanWin: string
}

export interface RtpReportView {
  readonly headline: {
    readonly rtp: string
    readonly ciLow: string
    readonly ciHigh: string
    readonly ciRange: string
    /** "Theoretical RTP 96.05% (95% CI 95.93–96.17%)". */
    readonly text: string
    readonly method: string
    readonly methodSentence: string
    readonly target: string
    readonly inBand: boolean
  }
  readonly breakdown: readonly StatItem[]
  readonly strata: readonly StratumRow[]
  readonly independentCheck: {
    readonly rtp: string
    readonly ciRange: string
    readonly spins: string
    readonly z: number
    readonly zText: string
    readonly consistent: boolean
    readonly sentence: string
  }
  readonly keyStats: readonly StatItem[]
  readonly hitFrequency: string
  readonly volatility: { readonly sigma: string; readonly label: string }
  readonly featureTrigger: string
  readonly winCap: string
  readonly distribution: readonly DistributionPanel[]
  readonly reproducibility: readonly StatItem[]
  readonly codeFiles: readonly string[]
  readonly command: string
}

function orNotMeasured(value: number | null, format: (v: number) => string): string {
  return value === null ? NOT_MEASURED : format(value)
}

function bars(buckets: readonly RtpBucket[], total: number): DistributionBar[] {
  const max = Math.max(0, ...buckets.map((b) => b.count))
  return buckets.map((b) => ({
    label: b.label,
    count: formatNumber(b.count),
    share: formatShare(total > 0 ? b.count / total : 0),
    oneIn: b.count > 0 ? formatOneIn(total / b.count) : '—',
    relative: max > 0 ? b.count / max : 0,
  }))
}

export function buildRtpReportView(r: RtpReportData): RtpReportView {
  const h = r.rtp.headline
  const p = r.rtp.plainSim
  const sf = r.rtp.stratifiedFeature
  const spins = formatNumber(r.spins)

  const ciRange = formatPercentRange(h.ci95Low, h.ci95High)
  const z = zScore(p.value, p.standardError, h.value, h.standardError)
  const consistent = Math.abs(z) < Z_95
  const sigmaLabel = volatilityLabel(r.sigmaPerSpinX)

  const zeroBuckets = r.winDistribution.filter((b) => b.maxX === 0)
  const winBuckets = r.winDistribution.filter((b) => b.maxX !== 0)
  const winningSpins = winBuckets.reduce((a, b) => a + b.count, 0)
  const largestWinBucket = winBuckets.length > 0 ? winBuckets.reduce((a, b) => (b.count > a.count ? b : a)) : null

  return {
    headline: {
      rtp: formatPercent(h.value),
      ciLow: formatPercent(h.ci95Low),
      ciHigh: formatPercent(h.ci95High),
      ciRange,
      text: `Theoretical RTP ${formatPercent(h.value)} (95% CI ${ciRange})`,
      method: h.method,
      methodSentence:
        `Method: ${h.method}. The base game is computed exactly over every reel-stop combination; ` +
        `the free-spin feature is simulated separately for each chest count ` +
        `(${formatNumber(sf.featuresPerStratum)} features per count) and weighted by its exact trigger chance.`,
      target: `Target ${formatPercent(r.target.rtp, 1)}, band ${formatPercentRange(r.target.bandLow, r.target.bandHigh, 1)}`,
      inBand: h.value >= r.target.bandLow && h.value <= r.target.bandHigh,
    },
    breakdown: [
      { id: 'base-ways', label: 'Base game ways pays', value: formatPercent(r.rtp.baseWays), detail: 'exact' },
      { id: 'scatter', label: 'Scatter (Treasure Chest) pays', value: formatPercent(r.rtp.scatter), detail: 'exact' },
      { id: 'base-total', label: 'Base game total', value: formatPercent(r.rtp.baseExact), detail: 'exact' },
      {
        id: 'feature',
        label: 'Free-spin feature',
        value: formatPercent(sf.value),
        detail: `stratified simulation, 95% CI ${formatPercentRange(sf.ci95Low, sf.ci95High)}`,
      },
      { id: 'total', label: 'Total (theoretical RTP)', value: formatPercent(h.value), detail: `95% CI ${ciRange}` },
    ],
    strata: sf.strata.map((s) => ({
      chests: formatNumber(s.chests),
      chance: formatOneIn(1 / s.probability),
      freeSpins: formatNumber(s.freeSpins),
      meanWin: formatTimesBet(s.meanWinX),
    })),
    independentCheck: {
      rtp: formatPercent(p.value),
      ciRange: formatPercentRange(p.ci95Low, p.ci95High),
      spins,
      z,
      zText: `z = ${formatNumber(z, 2)}`,
      consistent,
      sentence: consistent
        ? 'The two independent estimates agree within their combined 95% confidence range.'
        : 'The two estimates differ by more than their combined 95% confidence range: the report needs investigation.',
    },
    keyStats: [
      {
        id: 'hit-frequency',
        label: 'Hit frequency',
        value: formatPercent(r.hitFrequency),
        detail: `of spins pay something (exact base game: ${formatPercent(r.hitFrequencyExact)})`,
      },
      {
        id: 'volatility',
        label: 'Volatility',
        value: `σ ${formatTimesBet(r.sigmaPerSpinX, 2)} bet`,
        detail: `${sigmaLabel}: standard deviation of one spin's win, in multiples of total bet`,
      },
      {
        id: 'trigger',
        label: 'Free-spin trigger',
        value: formatOneIn(r.featureTriggerOneInExact),
        detail: `spins (exact); simulated: ${orNotMeasured(r.featureTriggerOneIn, formatOneIn)} over ${formatNumber(r.features)} features`,
      },
      {
        id: 'feature-win',
        label: 'Average feature win',
        value: orNotMeasured(r.avgFeatureWinX, (v) => `${formatTimesBet(v)} bet`),
        detail: 'paid by the free spins themselves (the triggering spin’s pays are counted separately)',
      },
      {
        id: 'free-spins',
        label: 'Average free spins',
        value: orNotMeasured(r.avgFreeSpinsPerFeature, (v) => formatNumber(v, 2)),
        detail: 'per feature, retriggers included',
      },
      {
        id: 'retrigger',
        label: 'Retrigger rate',
        value: orNotMeasured(r.retriggerRate, (v) => formatPercent(v)),
        detail: 'of features retrigger at least once',
      },
      {
        id: 'cap',
        label: 'Win cap',
        value: `${formatTimesBet(r.game.winCapX, 0)} bet`,
        detail: `reached ${formatNumber(r.capHits)} times in ${spins} spins`,
      },
      {
        id: 'max-win',
        label: 'Largest win observed',
        value: `${formatTimesBet(r.maxWinX)} bet`,
        detail: `in ${spins} simulated spins`,
      },
    ],
    hitFrequency: formatPercent(r.hitFrequency),
    volatility: { sigma: `${formatTimesBet(r.sigmaPerSpinX, 2)} bet`, label: sigmaLabel },
    featureTrigger: formatOneIn(r.featureTriggerOneInExact),
    winCap: `${formatTimesBet(r.game.winCapX, 0)} bet`,
    distribution: [
      {
        id: 'all',
        title: 'All spins',
        caption:
          `Share of ${spins} simulated spins by total win (base spin plus any feature), in multiples of total bet. ` +
          `${zeroBuckets.map((b) => b.label).join(', ')} dominates, so the tail is shown again below.`,
        bars: bars(r.winDistribution, r.spins),
      },
      {
        id: 'wins',
        title: 'Winning spins only',
        caption:
          `The same data for the ${formatNumber(winningSpins)} spins that paid, as a share of winning spins. ` +
          (largestWinBucket ? `Bars are scaled to the largest bucket (${largestWinBucket.label}); ` : '') +
          'very small shares are drawn as a thin tick and labelled.',
        bars: bars(winBuckets, winningSpins),
      },
    ],
    reproducibility: [
      { id: 'version', label: 'Math version', value: r.math.version },
      { id: 'math-hash', label: 'Math hash', value: r.math.mathHash, detail: 'strips, paytable and feature rules' },
      { id: 'code-hash', label: 'Code hash', value: r.math.codeHash, detail: 'source of the rule files below' },
      { id: 'seed', label: 'Simulation seed', value: String(r.seed), detail: `${spins} full-game spins` },
      {
        id: 'stratified-seed',
        label: 'Feature simulation seed',
        value: String(sf.seed),
        detail: `${formatNumber(sf.featuresPerStratum)} features × ${formatNumber(sf.strata.length)} chest counts`,
      },
      { id: 'rng', label: 'Simulation RNG', value: r.rng },
      {
        id: 'generated',
        label: 'Generated',
        value: formatTimestamp(r.generatedAt),
        detail: `run time ${formatNumber(r.runtimeSeconds, 1)} s, report schema v${r.schemaVersion}`,
      },
    ],
    codeFiles: r.math.codeFiles,
    command: 'npm run sim',
  }
}

/** The view model for the committed report. */
export const RTP_REPORT_VIEW: RtpReportView = buildRtpReportView(report)
