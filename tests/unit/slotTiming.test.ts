import { describe, expect, it } from 'vitest'
import { createInitialState, slotReducer, type SlotAction, type SlotState } from '../../src/controllers/slotReducer'
import { isBigWin, nextAutoStep, NORMAL_TIMING, REDUCED_MOTION_TIMING } from '../../src/controllers/slotTiming'
import { BASE_WIN, BIG_WIN, FEATURE, NO_WIN } from './slotFixtures'

const fresh = () => createInitialState({ balance: 10_000, betLevel: 0, history: [] })

/** Follow nextAutoStep from a spin until the machine waits for the player. */
function autoPlay(result = FEATURE, timing = NORMAL_TIMING) {
  let s: SlotState = slotReducer(fresh(), { type: 'SPIN', result })
  let totalMs = 0
  const actions: SlotAction['type'][] = []
  for (let guard = 0; guard < 1_000; guard++) {
    const step = nextAutoStep(s, timing)
    if (!step) break
    totalMs += step.delayMs
    actions.push(step.action.type)
    s = slotReducer(s, step.action)
  }
  return { s, totalMs, actions }
}

describe('nextAutoStep', () => {
  it('waits for the player in IDLE', () => {
    expect(nextAutoStep(fresh(), NORMAL_TIMING)).toBeNull()
  })

  it('stops reels one by one with the stagger, then reveals', () => {
    const { actions } = autoPlay(BASE_WIN)
    expect(actions).toEqual(['STOP_REEL', 'STOP_REEL', 'STOP_REEL', 'STOP_REEL', 'STOP_REEL', 'REVEAL', 'WINS_DONE'])
    const spinning = slotReducer(fresh(), { type: 'SPIN', result: BASE_WIN })
    expect(nextAutoStep(spinning, NORMAL_TIMING)?.delayMs).toBe(NORMAL_TIMING.spinMs)
    const stopping = slotReducer(spinning, { type: 'STOP_REEL' })
    expect(nextAutoStep(stopping, NORMAL_TIMING)?.delayMs).toBe(NORMAL_TIMING.reelStaggerMs)
  })

  it('auto-plays a whole feature back to IDLE with the right total', () => {
    const { s } = autoPlay(FEATURE)
    expect(s.phase).toBe('IDLE')
    expect(s.revealedCoins).toBe(FEATURE.totalCoins)
  })

  it('a losing spin returns to IDLE without a win display', () => {
    const { s, actions } = autoPlay(NO_WIN)
    expect(s.phase).toBe('IDLE')
    expect(actions).not.toContain('WINS_DONE')
  })

  it('holds a big win longer', () => {
    let s: SlotState = slotReducer(fresh(), { type: 'SPIN', result: BIG_WIN })
    s = slotReducer(s, { type: 'SLAM_STOP' })
    s = slotReducer(s, { type: 'REVEAL' })
    expect(isBigWin(s)).toBe(true)
    expect(nextAutoStep(s, NORMAL_TIMING)?.delayMs).toBe(NORMAL_TIMING.bigWinMs)
  })

  it('reduced motion is much faster', () => {
    const normal = autoPlay(FEATURE, NORMAL_TIMING).totalMs
    const reduced = autoPlay(FEATURE, REDUCED_MOTION_TIMING).totalMs
    expect(reduced).toBeLessThan(normal / 2)
  })
})
