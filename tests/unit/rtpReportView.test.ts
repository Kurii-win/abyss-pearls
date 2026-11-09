/**
 * The Math & Fairness view model, against the real committed report. Expected strings
 * are rebuilt here from the raw JSON with plain toFixed / Math.round, independently of
 * the controller's helpers.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildRtpReportView,
  formatOneIn,
  formatPercent,
  formatPercentRange,
  formatShare,
  formatTimesBet,
  formatTimestamp,
  RTP_REPORT_VIEW,
  volatilityLabel,
  zScore,
  type RtpReportData,
} from '../../src/controllers/rtpReportView'

const REPORT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../reports/rtp-report.json')
const raw = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as RtpReportData
const pct = (f: number) => `${(f * 100).toFixed(2)}%`
const grouped = (n: number) => n.toLocaleString('en-US')

describe('formatting helpers', () => {
  it('rounds percentages to two decimals (half up at the 3rd)', () => {
    expect(formatPercent(0.9604950396856338)).toBe('96.05%')
    expect(formatPercent(0.95929)).toBe('95.93%')
    expect(formatPercent(0.96, 1)).toBe('96.0%')
    expect(formatPercent(0)).toBe('0.00%')
    expect(formatPercent(-0.0123)).toBe('−1.23%')
  })

  it('formats a CI range with an en dash and one percent sign', () => {
    expect(formatPercentRange(0.9592945861081084, 0.9616954932631592)).toBe('95.93–96.17%')
  })

  it('formats "1 in N" rounded to a whole number with separators', () => {
    expect(formatOneIn(151.73604105155044)).toBe('1 in 152')
    expect(formatOneIn(151.4)).toBe('1 in 151')
    expect(formatOneIn(384615.38)).toBe('1 in 384,615')
  })

  it('formats multiples of the bet', () => {
    expect(formatTimesBet(2167.6)).toBe('2,167.6×')
    expect(formatTimesBet(5000, 0)).toBe('5,000×')
    expect(formatTimesBet(7.367029994157203, 2)).toBe('7.37×')
  })

  it('keeps tiny shares visible instead of rounding them to zero', () => {
    expect(formatShare(0.6813836)).toBe('68.14%')
    expect(formatShare(0.0007263)).toBe('0.073%')
    expect(formatShare(0.0000026)).toBe('0.00026%')
    expect(formatShare(0)).toBe('0%')
  })

  it('formats the report timestamp in UTC', () => {
    expect(formatTimestamp('2026-11-09T09:22:11.637Z')).toBe('2026-11-09 09:22 UTC')
    expect(formatTimestamp('not a date')).toBe('not a date')
  })

  it('labels volatility bands', () => {
    expect(volatilityLabel(2)).toBe('Low')
    expect(volatilityLabel(4)).toBe('Medium')
    expect(volatilityLabel(7.4)).toBe('Medium-high')
    expect(volatilityLabel(12)).toBe('High')
    expect(volatilityLabel(20)).toBe('Very high')
  })

  it('computes z for two independent estimates', () => {
    expect(zScore(1, 0.3, 1, 0.4)).toBe(0)
    expect(zScore(2, 0.3, 1, 0.4)).toBeCloseTo(2, 12) // sqrt(0.09 + 0.16) = 0.5
    expect(zScore(1, 0, 1, 0)).toBe(0)
  })
})

describe('RTP_REPORT_VIEW on the committed report', () => {
  const v = RTP_REPORT_VIEW

  it('headline reads rtp.headline', () => {
    const h = raw.rtp.headline
    expect(v.headline.rtp).toBe(pct(h.value))
    expect(v.headline.ciLow).toBe(pct(h.ci95Low))
    expect(v.headline.ciHigh).toBe(pct(h.ci95High))
    expect(v.headline.text).toBe(
      `Theoretical RTP ${pct(h.value)} (95% CI ${(h.ci95Low * 100).toFixed(2)}–${(h.ci95High * 100).toFixed(2)}%)`,
    )
    expect(v.headline.method).toBe(h.method)
    expect(v.headline.methodSentence).toContain(h.method)
    expect(v.headline.inBand).toBe(true)
  })

  it('breakdown adds up: ways + scatter = base, base + feature = headline', () => {
    const r = raw.rtp
    expect(r.baseWays + r.scatter).toBeCloseTo(r.baseExact, 12)
    expect(r.baseExact + r.stratifiedFeature.value).toBeCloseTo(r.headline.value, 12)
    const byId = Object.fromEntries(v.breakdown.map((b) => [b.id, b.value]))
    expect(byId).toEqual({
      'base-ways': pct(r.baseWays),
      scatter: pct(r.scatter),
      'base-total': pct(r.baseExact),
      feature: pct(r.stratifiedFeature.value),
      total: pct(r.headline.value),
    })
  })

  it('breakdown reads as a ledger: base total, its parts, feature, then the total (tester M4 g)', () => {
    expect(v.breakdown.map((b) => [b.id, b.level ?? 0, b.total ?? false])).toEqual([
      ['base-total', 0, false],
      ['base-ways', 1, false],
      ['scatter', 1, false],
      ['feature', 0, false],
      ['total', 0, true],
    ])
    for (const part of v.breakdown.filter((b) => b.level === 1)) expect(part.label).toMatch(/^of which /)
  })

  it('only hashes are marked as hashes (normal wrapping elsewhere, tester M4 h)', () => {
    expect(v.reproducibility.filter((r) => r.hash).map((r) => r.id)).toEqual(['math-hash', 'code-hash'])
  })

  it('the wins-only chart caption says the minimum tick is not to scale (tester M4 j)', () => {
    expect(v.distribution[1].caption).toContain('minimum 2 px tick (not to scale)')
  })

  it('independent check: z from plain sim vs headline', () => {
    const { plainSim: p, headline: h } = raw.rtp
    const z = (p.value - h.value) / Math.sqrt(p.standardError ** 2 + h.standardError ** 2)
    expect(v.independentCheck.z).toBeCloseTo(z, 12)
    expect(v.independentCheck.zText).toBe(`z = ${z.toFixed(2).replace('-', '−')}`)
    expect(v.independentCheck.consistent).toBe(Math.abs(z) < 1.96)
    expect(v.independentCheck.rtp).toBe(pct(p.value))
    expect(v.independentCheck.spins).toBe(grouped(raw.spins))
  })

  it('key stats come from the report fields', () => {
    expect(v.hitFrequency).toBe(pct(raw.hitFrequency))
    expect(v.featureTrigger).toBe(`1 in ${Math.round(raw.featureTriggerOneInExact)}`)
    expect(v.volatility.sigma).toBe(`${raw.sigmaPerSpinX.toFixed(2)}× bet`)
    expect(v.winCap).toBe(`${grouped(raw.game.winCapX)}× bet`)
    const stat = (id: string) => v.keyStats.find((s) => s.id === id)
    expect(stat('cap')?.detail).toBe(`reached ${grouped(raw.capHits)} times in ${grouped(raw.spins)} spins`)
    expect(stat('max-win')?.value).toBe(`${grouped(raw.maxWinX)}× bet`)
    expect(stat('retrigger')?.value).toBe(pct(raw.retriggerRate ?? NaN))
  })

  it('win distribution: every bucket, all-spins panel and wins-only panel', () => {
    const [all, wins] = v.distribution
    expect(all.bars.map((b) => b.label)).toEqual(raw.winDistribution.map((b) => b.label))
    expect(all.bars.map((b) => b.count)).toEqual(raw.winDistribution.map((b) => grouped(b.count)))
    expect(Math.max(...all.bars.map((b) => b.relative))).toBe(1)

    const winBuckets = raw.winDistribution.filter((b) => b.maxX !== 0)
    const winning = winBuckets.reduce((a, b) => a + b.count, 0)
    expect(winning / raw.spins).toBeCloseTo(raw.hitFrequency, 12)
    expect(wins.bars.map((b) => b.label)).toEqual(winBuckets.map((b) => b.label))
    expect(wins.bars.map((b) => b.share)).toEqual(winBuckets.map((b) => formatShare(b.count / winning)))
    // Smallest tail bucket still shows a non-zero share and a finite "1 in N".
    const tail = wins.bars[wins.bars.length - 1]
    expect(tail.relative).toBeGreaterThan(0)
    expect(tail.share).not.toBe('0%')
    expect(tail.oneIn).toMatch(/^1 in [\d,]+$/)
  })

  it('reproducibility shows hashes, seeds and the command', () => {
    const byId = Object.fromEntries(v.reproducibility.map((s) => [s.id, s.value]))
    expect(byId['math-hash']).toBe(raw.math.mathHash)
    expect(byId['code-hash']).toBe(raw.math.codeHash)
    expect(byId.version).toBe(raw.math.version)
    expect(byId.seed).toBe(String(raw.seed))
    expect(byId['stratified-seed']).toBe(String(raw.rtp.stratifiedFeature.seed))
    expect(v.codeFiles).toEqual(raw.math.codeFiles)
    expect(v.command).toBe('npm run sim')
  })

  it('shows "not measured" rather than a fake number when a sim stat is null', () => {
    const v2 = buildRtpReportView({ ...raw, avgFeatureWinX: null, retriggerRate: null, featureTriggerOneIn: null })
    const stat = (id: string) => v2.keyStats.find((s) => s.id === id)
    expect(stat('feature-win')?.value).toBe('not measured')
    expect(stat('retrigger')?.value).toBe('not measured')
    expect(stat('trigger')?.detail).toContain('not measured')
  })

  it('flags an out-of-band headline and an inconsistent check', () => {
    const v2 = buildRtpReportView({
      ...raw,
      rtp: { ...raw.rtp, headline: { ...raw.rtp.headline, value: 0.9 }, plainSim: { ...raw.rtp.plainSim, value: 0.96 } },
    })
    expect(v2.headline.inBand).toBe(false)
    expect(v2.independentCheck.consistent).toBe(false)
  })
})
