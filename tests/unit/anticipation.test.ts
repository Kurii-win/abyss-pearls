import { describe, expect, it } from 'vitest'
import {
  anticipatingReels,
  anticipationStart,
  chestsOnStoppedReels,
  reelAnticipates,
} from '../../src/controllers/anticipation'
import { createInitialState, slotReducer, type SlotAction, type SlotState } from '../../src/controllers/slotReducer'
import { nextAutoStep, NORMAL_TIMING, REDUCED_MOTION_TIMING } from '../../src/controllers/slotTiming'
import type { Grid, SymbolId } from '../../src/models/types'
import { BASE_WIN, FEATURE, seededSpin } from './slotFixtures'

const fresh = () => createInitialState({ balance: 10_000, betLevel: 0, history: [] })
const run = (state: SlotState, ...actions: SlotAction[]) => actions.reduce(slotReducer, state)
const STOP: SlotAction = { type: 'STOP_REEL' }
const C = 'CHEST' as const
const P = 'PEARL' as const
const col = (...s: SymbolId[]): readonly SymbolId[] => s

/** Seed 12's first spin: chests on reels 1–3 → reels 4 and 5 tease, no trigger. */
const TEASE = seededSpin(12)

describe('anticipationStart', () => {
  it('starts on the reel after the second chest', () => {
    const grid: Grid = [col(C, P, P), col(P, P, P), col(P, C, P), col(P, P, P), col(P, P, P)]
    expect(anticipationStart(grid)).toBe(3)
  })

  it('null when fewer than two chests land before the last reel', () => {
    expect(anticipationStart([col(C, P, P), col(P, P, P), col(P, P, P), col(P, P, P), col(C, P, P)])).toBeNull()
    expect(anticipationStart(BASE_WIN.grid)).toBeNull()
  })

  it('two chests on the first four reels → only the last reel teases', () => {
    expect(anticipationStart([col(P, P, P), col(P, P, P), col(C, P, P), col(P, C, P), col(P, P, P)])).toBe(4)
  })

  it('real seeded spins', () => {
    expect(anticipationStart(TEASE.grid)).toBe(3)
    expect(anticipationStart(FEATURE.grid)).toBe(3)
  })
})

describe('anticipation over a spin', () => {
  it('glows only once the chests are on screen, on reels still spinning', () => {
    let s = slotReducer(fresh(), { type: 'SPIN', result: TEASE })
    expect(anticipatingReels(s)).toEqual([false, false, false, false, false])
    s = run(s, STOP, STOP)
    expect(anticipatingReels(s).some(Boolean)).toBe(false)
    s = run(s, STOP) // reels 1–3 stopped: 2+ chests visible
    expect(chestsOnStoppedReels(s)).toBeGreaterThanOrEqual(2)
    expect(anticipatingReels(s)).toEqual([false, false, false, true, true])
    s = run(s, STOP)
    expect(anticipatingReels(s)).toEqual([false, false, false, false, true])
    s = run(s, STOP)
    expect(anticipatingReels(s)).toEqual([false, false, false, false, false])
  })

  it('the teasing reels wait anticipationMs longer; the result is untouched', () => {
    let s = run(slotReducer(fresh(), { type: 'SPIN', result: TEASE }), STOP)
    expect(nextAutoStep(s, NORMAL_TIMING)?.delayMs).toBe(NORMAL_TIMING.reelStaggerMs) // reel 2
    s = run(s, STOP)
    expect(nextAutoStep(s, NORMAL_TIMING)?.delayMs).toBe(NORMAL_TIMING.reelStaggerMs) // reel 3
    s = run(s, STOP)
    expect(reelAnticipates(s, 3)).toBe(true)
    expect(nextAutoStep(s, NORMAL_TIMING)?.delayMs).toBe(NORMAL_TIMING.reelStaggerMs + NORMAL_TIMING.anticipationMs)
    s = run(s, STOP)
    expect(nextAutoStep(s, NORMAL_TIMING)?.delayMs).toBe(NORMAL_TIMING.reelStaggerMs + NORMAL_TIMING.anticipationMs)
    s = run(s, STOP)
    expect(s.round!.result).toBe(TEASE)
  })

  it('reduced motion adds no delay', () => {
    const s = run(slotReducer(fresh(), { type: 'SPIN', result: TEASE }), STOP, STOP, STOP)
    expect(REDUCED_MOTION_TIMING.anticipationMs).toBe(0)
    expect(nextAutoStep(s, REDUCED_MOTION_TIMING)?.delayMs).toBe(REDUCED_MOTION_TIMING.reelStaggerMs)
  })

  it('a slam stop cancels anticipation', () => {
    const s = run(slotReducer(fresh(), { type: 'SPIN', result: TEASE }), STOP, STOP, STOP, { type: 'SLAM_STOP' })
    expect(reelAnticipates(s, 4)).toBe(false)
    expect(anticipatingReels(s).some(Boolean)).toBe(false)
  })

  it('nothing before the first spin', () => {
    expect(anticipatingReels(fresh()).some(Boolean)).toBe(false)
    expect(chestsOnStoppedReels(fresh())).toBe(0)
  })
})
