/**
 * Guards the committed reports/rtp-report.json, which the Math & Fairness page reads.
 * A missing, stale (data OR rule code changed) or experiment-generated report FAILS here:
 * fix it with `npm run sim`.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MATH_VERSION_LABEL, mathHash } from '../../src/models/mathVersion'
import { GAME_MATH } from '../../src/models/spin'
import { computeCodeHash, RULE_SOURCE_FILES } from '../sim/codeHash'
import {
  HEADLINE_METHOD,
  OFFICIAL_SIM,
  PLAIN_SIM_METHOD,
  REPORT_SCHEMA_VERSION,
  RTP_BAND,
  WIN_BUCKETS,
  type RtpReport,
} from '../sim/rtpSimulation'

const REPORT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../reports/rtp-report.json')

/** Throws (failing the test) if the report is missing or not valid JSON. */
function loadReport(): RtpReport {
  return JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as RtpReport
}

describe('reports/rtp-report.json', () => {
  it('exists (run `npm run sim` to generate it)', () => {
    expect(() => loadReport()).not.toThrow()
  })

  it('has every field the Math & Fairness page reads', () => {
    const r = loadReport()
    expect(r.schemaVersion).toBe(REPORT_SCHEMA_VERSION)
    expect(typeof r.generatedAt).toBe('string')
    expect(r.game).toMatchObject({ grid: '5x3', ways: 243, coinsPerBet: 25, winCapX: 5000 })
    for (const block of [r.rtp.headline, r.rtp.plainSim]) {
      for (const key of ['value', 'ci95Low', 'ci95High', 'standardError'] as const) {
        expect(typeof block[key]).toBe('number')
      }
    }
    expect(r.rtp.headline.method).toBe(HEADLINE_METHOD)
    expect(r.rtp.plainSim.method).toBe(PLAIN_SIM_METHOD)
    expect(r.rtp).not.toHaveProperty('totalExactBasePlusFeatureSim')
    for (const v of [
      r.rtp.baseExact, r.rtp.scatter, r.rtp.stratifiedFeature.value,
      r.hitFrequency, r.sigmaPerSpinX, r.featureTriggerOneIn, r.avgFeatureWinX, r.avgFreeSpinsPerFeature,
      r.retriggerRate, r.capHitRate, r.capHits, r.maxWinX,
    ]) {
      expect(typeof v).toBe('number')
    }
    expect(r.winDistribution.map((b) => b.label)).toEqual(WIN_BUCKETS.map((b) => b.label))
    expect(r.winDistribution.reduce((a, b) => a + b.count, 0)).toBe(r.spins)
  })

  it('comes from the official run, not an experiment', () => {
    const r = loadReport()
    expect(r.seed).toBe(OFFICIAL_SIM.seed)
    expect(r.spins).toBe(OFFICIAL_SIM.spins)
    expect(r.rtp.stratifiedFeature.seed).toBe(OFFICIAL_SIM.stratifiedSeed)
    expect(r.rtp.stratifiedFeature.featuresPerStratum).toBe(OFFICIAL_SIM.featuresPerStratum)
  })

  it('was produced by the current math data (strips + paytable + feature settings)', () => {
    const r = loadReport()
    expect(r.math.version).toBe(MATH_VERSION_LABEL)
    expect(r.math.mathHash).toBe(mathHash(GAME_MATH))
  })

  it('was produced by the current rule code (any edit to a rule file makes it stale)', () => {
    const r = loadReport()
    expect(r.math.codeFiles).toEqual([...RULE_SOURCE_FILES])
    expect(r.math.codeHash).toBe(computeCodeHash())
  })

  it('headline RTP 95% CI (exact base + stratified feature) lies inside the target band', () => {
    const h = loadReport().rtp.headline
    expect(h.ci95Low).toBeGreaterThanOrEqual(RTP_BAND.low)
    expect(h.ci95High).toBeLessThanOrEqual(RTP_BAND.high)
    expect(h.ci95Low).toBeLessThan(h.value)
    expect(h.ci95High).toBeGreaterThan(h.value)
  })

  it('plain full-game sim is consistent with the headline (|z| < 4)', () => {
    const { headline: h, plainSim: p } = loadReport().rtp
    const z = (p.value - h.value) / Math.hypot(p.standardError, h.standardError)
    expect(Math.abs(z)).toBeLessThan(4)
  })
})
