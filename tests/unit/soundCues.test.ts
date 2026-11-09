import { describe, expect, it } from 'vitest'
import { cuesForTransition, type SoundCue } from '../../src/controllers/soundCues'
import { createInitialState, slotReducer, type SlotAction, type SlotState } from '../../src/controllers/slotReducer'
import { nextAutoStep, NORMAL_TIMING } from '../../src/controllers/slotTiming'
import type { SpinResult } from '../../src/models/types'
import { BASE_WIN, BIG_WIN, FEATURE, NO_WIN, RETRIGGER, seededSpin } from './slotFixtures'

const fresh = () => createInitialState({ balance: 10_000, betLevel: 0, history: [] })

/** Play a whole round with the real auto-steps, collecting every cue in order. */
function cuesOfRound(result: SpinResult, interrupt?: { at: number; action: SlotAction }): SoundCue[] {
  let s: SlotState = fresh()
  const cues: SoundCue[] = []
  const step = (action: SlotAction) => {
    const next = slotReducer(s, action)
    cues.push(...cuesForTransition(s, next))
    s = next
  }
  step({ type: 'SPIN', result })
  for (let i = 0; i < 2_000; i++) {
    if (interrupt && i === interrupt.at) step(interrupt.action)
    const auto = nextAutoStep(s, NORMAL_TIMING)
    if (!auto) break
    step(auto.action)
  }
  return cues
}

const kinds = (cues: readonly SoundCue[]) => cues.map((c) => c.kind)

describe('cuesForTransition', () => {
  it('no transition, no cues', () => {
    const s = fresh()
    expect(cuesForTransition(s, s)).toEqual([])
  })

  it('a losing spin: spin start and five reel stops with stepping reel numbers', () => {
    const cues = cuesOfRound(NO_WIN)
    expect(cues[0]).toEqual({ kind: 'spinStart', free: false })
    expect(cues.filter((c) => c.kind === 'reelStop')).toEqual(
      [0, 1, 2, 3, 4].map((reel) => ({ kind: 'reelStop', reel, slam: false })),
    )
    expect(kinds(cues)).not.toContain('win')
  })

  it('a base win ends with a win cue', () => {
    const cues = cuesOfRound(BASE_WIN)
    expect(cues.at(-1)).toEqual({ kind: 'win', tier: 'small' })
  })

  it('a big win plays the flourish instead of the plain win', () => {
    const k = kinds(cuesOfRound(BIG_WIN))
    expect(k).toContain('bigWin')
    expect(k).not.toContain('win')
  })

  it('slam stop: the remaining reels stop at once, marked as slammed', () => {
    let s = slotReducer(fresh(), { type: 'SPIN', result: NO_WIN })
    const one = slotReducer(s, { type: 'STOP_REEL' })
    expect(cuesForTransition(s, one)).toEqual([{ kind: 'reelStop', reel: 0, slam: false }])
    s = one
    const slam = slotReducer(s, { type: 'SLAM_STOP' })
    expect(cuesForTransition(s, slam)).toEqual(
      [1, 2, 3, 4].map((reel) => ({ kind: 'reelStop', reel, slam: true })),
    )
  })

  it('chests: a scatter cue per reel that adds chests, then anticipation once', () => {
    const tease = seededSpin(12) // chests on reels 1–3, reels 4–5 tease
    const cues = cuesOfRound(tease)
    const scatter = cues.filter((c) => c.kind === 'scatterLand')
    expect(scatter.length).toBeGreaterThanOrEqual(2)
    const counts = scatter.map((c) => (c.kind === 'scatterLand' ? c.chests : 0))
    expect([...counts].sort((a, b) => a - b)).toEqual(counts) // only ever grows
    expect(kinds(cues).filter((k) => k === 'anticipation')).toHaveLength(1)
    // Anticipation sounds right after reel 3 lands.
    const i = kinds(cues).indexOf('anticipation')
    expect(cues.slice(0, i).filter((c) => c.kind === 'reelStop')).toHaveLength(3)
  })

  it('a feature: intro, a spin start per free spin (marked free), outro', () => {
    const cues = cuesOfRound(FEATURE)
    const k = kinds(cues)
    expect(k.filter((x) => x === 'featureIntro')).toHaveLength(1)
    expect(k.filter((x) => x === 'featureOutro')).toHaveLength(1)
    expect(k.indexOf('featureIntro')).toBeLessThan(k.indexOf('featureOutro'))
    const freeStarts = cues.filter((c) => c.kind === 'spinStart' && c.free)
    expect(freeStarts).toHaveLength(FEATURE.feature!.spins.length)
    expect(k.at(-1)).toBe('featureOutro')
  })

  it('a retrigger is announced with the spins it adds', () => {
    const cues = cuesOfRound(RETRIGGER)
    const added = RETRIGGER.feature!.spins.find((x) => x.retriggerSpins > 0)!.retriggerSpins
    expect(cues).toContainEqual({ kind: 'retrigger', spins: added })
  })

  it('Skip jumps to the outro without reel-stop cues', () => {
    let s = slotReducer(fresh(), { type: 'SPIN', result: FEATURE })
    s = [...Array(5)].reduce<SlotState>((st) => slotReducer(st, { type: 'STOP_REEL' }), s)
    s = slotReducer(slotReducer(s, { type: 'REVEAL' }), { type: 'WINS_DONE' })
    s = slotReducer(s, { type: 'START_FREE_SPINS' })
    const skipped = slotReducer(s, { type: 'SKIP_FEATURE' })
    expect(cuesForTransition(s, skipped)).toEqual([{ kind: 'featureOutro' }])
  })
})
