/**
 * Presentation pacing: how long each state of the machine lasts before the hook moves
 * it on. Pure, so the schedule is unit-tested; useSlotMachine only runs the timers.
 */
import { COINS_PER_BET } from '../models/paytable'
import { reelAnticipates } from './anticipation'
import { currentSpinCoins, type SlotAction, type SlotState } from './slotReducer'

export interface SlotTiming {
  /** All reels spin this long before reel 1 stops. */
  readonly spinMs: number
  /** Gap between one reel stopping and the next. */
  readonly reelStaggerMs: number
  /** Extra spin time for each reel that anticipates a scatter (see anticipation.ts). */
  readonly anticipationMs: number
  /** Pause on the stopped reels before wins show. */
  readonly evaluateMs: number
  /** Pause on a losing free spin before the next one starts. */
  readonly freeSpinNoWinMs: number
  readonly showWinsMs: number
  readonly bigWinMs: number
  readonly freeSpinShowWinsMs: number
  readonly introMs: number
  readonly outroMs: number
  /** Count-up animation length for balance and win. */
  readonly countUpMs: number
  /** Time each way win stays highlighted while cycling. */
  readonly winCycleMs: number
}

export const NORMAL_TIMING: SlotTiming = {
  spinMs: 650,
  reelStaggerMs: 220,
  anticipationMs: 650,
  evaluateMs: 150,
  freeSpinNoWinMs: 550,
  showWinsMs: 1500,
  bigWinMs: 3500,
  freeSpinShowWinsMs: 1400,
  introMs: 2600,
  outroMs: 4000,
  countUpMs: 800,
  winCycleMs: 1000,
}

/** prefers-reduced-motion: no long scrolls, no anticipation delay, shorter holds. */
export const REDUCED_MOTION_TIMING: SlotTiming = {
  spinMs: 120,
  reelStaggerMs: 40,
  anticipationMs: 0,
  evaluateMs: 50,
  freeSpinNoWinMs: 250,
  showWinsMs: 900,
  bigWinMs: 1500,
  freeSpinShowWinsMs: 700,
  introMs: 1200,
  outroMs: 1800,
  countUpMs: 0,
  winCycleMs: 1200,
}

/** Big-win overlay threshold, as a multiple of the total bet. */
export const BIG_WIN_X = 20

/** The base spin on the reels pays at least BIG_WIN_X × bet. */
export function isBigWin(state: SlotState): boolean {
  return (
    state.phase === 'SHOWING_WINS' &&
    state.freeSpinIndex === null &&
    (state.round?.result.baseCoins ?? 0) >= BIG_WIN_X * COINS_PER_BET
  )
}

export interface AutoStep {
  readonly action: SlotAction
  readonly delayMs: number
}

/** The action the machine takes on its own from `state`, and after how long; null = wait for the player. */
export function nextAutoStep(state: SlotState, timing: SlotTiming): AutoStep | null {
  const free = state.freeSpinIndex !== null
  switch (state.phase) {
    case 'IDLE':
      return null
    case 'SPINNING':
      return { action: { type: 'STOP_REEL' }, delayMs: timing.spinMs }
    case 'STOPPING':
      // The next reel to stop is index `reelsStopped`; it may tease a scatter first.
      return {
        action: { type: 'STOP_REEL' },
        delayMs: timing.reelStaggerMs + (reelAnticipates(state, state.reelsStopped) ? timing.anticipationMs : 0),
      }
    case 'EVALUATING':
      return {
        action: { type: 'REVEAL' },
        delayMs: free && currentSpinCoins(state) === 0 ? timing.freeSpinNoWinMs : timing.evaluateMs,
      }
    case 'SHOWING_WINS':
      return {
        action: { type: 'WINS_DONE' },
        delayMs: free ? timing.freeSpinShowWinsMs : isBigWin(state) ? timing.bigWinMs : timing.showWinsMs,
      }
    case 'FREE_SPINS_INTRO':
      return { action: { type: 'START_FREE_SPINS' }, delayMs: timing.introMs }
    case 'FREE_SPINS_OUTRO':
      return { action: { type: 'END_FEATURE' }, delayMs: timing.outroMs }
  }
}
