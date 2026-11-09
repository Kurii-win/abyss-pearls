/**
 * `npm run sim`: 10,000,000 seeded paid spins (each with its full feature) plus the
 * stratified feature sim → reports/rtp-report.json (committed; read by the Math &
 * Fairness page). Settings are fixed in OFFICIAL_SIM so the report is reproducible.
 *
 * Experiments: set any of SIM_SEED, SIM_SPINS, SIM_FEATURES_PER_STRATUM. The result
 * then goes to reports/rtp-report.experiment.json (gitignored) and the official
 * report is never touched.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OFFICIAL_SIM, buildReport, simulate, simulateFeatureStratified } from '../../tests/sim/rtpSimulation'

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  const n = Number(raw)
  if (raw.trim() === '' || !Number.isInteger(n)) throw new Error(`${name} must be an integer, got "${raw}"`)
  return n
}

const OVERRIDE_VARS = ['SIM_SEED', 'SIM_SPINS', 'SIM_FEATURES_PER_STRATUM'] as const
const isExperiment = OVERRIDE_VARS.some((name) => process.env[name] !== undefined)

const seed = intFromEnv('SIM_SEED', OFFICIAL_SIM.seed)
const spins = intFromEnv('SIM_SPINS', OFFICIAL_SIM.spins)
const featuresPerStratum = intFromEnv('SIM_FEATURES_PER_STRATUM', OFFICIAL_SIM.featuresPerStratum)
// Official run keeps its fixed stratified seed; experiments derive it from SIM_SEED.
const stratifiedSeed = isExperiment ? seed + 1 : OFFICIAL_SIM.stratifiedSeed
if (spins <= 0 || featuresPerStratum <= 1) {
  throw new Error('SIM_SPINS must be > 0 and SIM_FEATURES_PER_STRATUM must be > 1')
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const out = resolve(root, isExperiment ? 'reports/rtp-report.experiment.json' : 'reports/rtp-report.json')
if (isExperiment) console.log('Experiment run (override set): the official report will not be touched.')

console.log(`Simulating ${spins.toLocaleString('en-US')} spins, seed ${seed}…`)
const t0 = performance.now()
const stats = simulate(seed, spins)
console.log(
  `Stratified feature sim: ${featuresPerStratum.toLocaleString('en-US')} features per chest count, seed ${stratifiedSeed}…`,
)
const stratified = simulateFeatureStratified(stratifiedSeed, featuresPerStratum)
const runtimeSeconds = Math.round((performance.now() - t0) / 10) / 100
const report = buildReport({ stats, seed, stratified, runtimeSeconds })

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(report, null, 2) + '\n')

const pct = (x: number) => `${(x * 100).toFixed(3)}%`
const { headline: h, plainSim: p } = report.rtp
console.log(`Headline RTP (${h.method}) ${pct(h.value)}  (95% CI ${pct(h.ci95Low)} – ${pct(h.ci95High)})`)
console.log(`Plain sim RTP ${pct(p.value)}  (95% CI ${pct(p.ci95Low)} – ${pct(p.ci95High)})`)
console.log(`Base (exact) ${pct(report.rtp.baseExact)}  Feature (stratified) ${pct(report.rtp.stratifiedFeature.value)}`)
console.log(`Hit frequency ${pct(report.hitFrequency)}  σ ${report.sigmaPerSpinX.toFixed(2)}× bet  ` +
  `trigger 1 in ${report.featureTriggerOneIn?.toFixed(1)}  max ${report.maxWinX.toFixed(1)}×`)
console.log(`math ${report.math.version}  mathHash ${report.math.mathHash}  codeHash ${report.math.codeHash}`)
console.log(`Wrote ${out} in ${runtimeSeconds}s`)
