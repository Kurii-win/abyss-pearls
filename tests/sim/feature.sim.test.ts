import { describe, expect, it } from 'vitest'
import { computeBaseRtp } from '../../src/models/exactRtp'
import { GAME_MATH } from '../../src/models/spin'
import { RTP_BAND, buildReport, meanAndSigma, simulate, simulateFeatureStratified } from './rtpSimulation'

// A quick (1M-spin) version of `npm run sim`. The full 10M run writes the report; this
// keeps `npm run test` fast while still checking the whole game end to end.
describe('full game simulation, 1,000,000 seeded spins (base + feature)', () => {
  const N = 1_000_000
  const stats = simulate(777, N)
  const { mean, sigma, stdErr } = meanAndSigma(stats)
  const stratified = simulateFeatureStratified(778, 20_000)
  const report = buildReport({ stats, seed: 777, stratified, runtimeSeconds: 0 })

  it('stores the stratified seed actually used, not a recomputed one', () => {
    expect(report.rtp.stratifiedFeature.seed).toBe(778)
    expect(report.rtp.stratifiedFeature.featuresPerStratum).toBe(20_000)
  })

  it('plain sim and stratified headline agree (|z| < 4)', () => {
    const { headline: h, plainSim: p } = report.rtp
    const z = (p.value - h.value) / Math.hypot(p.standardError, h.standardError)
    expect(Math.abs(z)).toBeLessThan(4)
  })

  it('base part of the sim agrees with the exact base RTP', () => {
    const exact = computeBaseRtp(GAME_MATH.baseStrips, GAME_MATH.basePaytable)
    // Base pays alone have a much smaller spread than the full game; use their own SE.
    expect(Math.abs(report.rtp.baseSim - exact.rtp)).toBeLessThan(0.01)
  })

  it('total RTP is consistent with the 95.5–96.5% band (within 4 standard errors)', () => {
    console.log(
      `[sim 1M] total=${(mean * 100).toFixed(2)}% ±${(1.96 * stdErr * 100).toFixed(2)}  ` +
        `feature=${(report.rtp.featureSim * 100).toFixed(2)}%  σ=${sigma.toFixed(2)}×  ` +
        `hit=${(report.hitFrequency * 100).toFixed(2)}%  trigger 1 in ${report.featureTriggerOneIn?.toFixed(1)}`,
    )
    expect(mean).toBeGreaterThan(RTP_BAND.low - 4 * stdErr)
    expect(mean).toBeLessThan(RTP_BAND.high + 4 * stdErr)
  })

  it('secondary targets: σ 6–10×, hit frequency 28–35%, feature ≈ 28%', () => {
    expect(sigma).toBeGreaterThan(5)
    expect(sigma).toBeLessThan(11)
    expect(report.hitFrequency).toBeGreaterThan(0.28)
    expect(report.hitFrequency).toBeLessThan(0.35)
    // Feature RTP has a large spread at 1M spins; check it loosely.
    expect(report.rtp.featureSim).toBeGreaterThan(0.24)
    expect(report.rtp.featureSim).toBeLessThan(0.32)
  })

  it('sim hit frequency agrees with the exact value', () => {
    const p = report.hitFrequencyExact
    expect(Math.abs(report.hitFrequency - p)).toBeLessThan(4 * Math.sqrt((p * (1 - p)) / N))
  })

  it('win distribution buckets cover every spin', () => {
    expect(report.winDistribution.reduce((a, b) => a + b.count, 0)).toBe(N)
    expect(report.winDistribution[0].fraction).toBeCloseTo(1 - report.hitFrequency, 12)
  })
}, 60_000)
