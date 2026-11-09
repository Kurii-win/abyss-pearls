/**
 * The one hook the Play page talks to. Owns everything impure around the pure state
 * machine: the RNG, timers (reel stop cadence, win display, free-spin auto-play),
 * localStorage persistence and reduced-motion detection.
 *
 * Rule 4 (Model decides, View performs): `pressSpin` calls the model's spin() exactly
 * once per accepted spin, BEFORE any animation, and hands the SpinResult to the reducer.
 * Views only receive derived, read-only data and intent callbacks; they never see the
 * RNG and cannot influence an outcome.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Rng } from '../models/rng'
import { GAME_MATH, spin } from '../models/spin'
import { BET_LEVELS, canAfford, canClaimFreePearls, FREE_PEARLS_GRANT, MIN_BET } from '../models/wallet'
import { createGameRng } from './gameRng'
import {
  announcement,
  bigWinView,
  featureView,
  reelSetView,
  type FeatureView,
  type ReelSetView,
} from './reelPresentation'
import {
  canSpin,
  createInitialState,
  currentBet,
  displayedBalance,
  displayedWin,
  inFeature,
  isReelsMoving,
  slotReducer,
  visibleHistory,
  type HistoryEntry,
  type SlotAction,
  type SlotPhase,
  type SlotState,
} from './slotReducer'
import { NORMAL_TIMING, nextAutoStep, REDUCED_MOTION_TIMING, type SlotTiming } from './slotTiming'
import { usePrefersReducedMotion } from './useMediaQuery'
import { loadSlotData, saveSlotData } from './walletStorage'

/** Which art the Spin button shows. */
export type SpinButtonMode = 'idle' | 'stop' | 'disabled' | 'freespins'

export interface SlotMachine {
  readonly phase: SlotPhase
  readonly reels: ReelSetView
  /** Reels (from the left) that have landed on the spin being shown. */
  readonly reelsStopped: number
  readonly reelsMoving: boolean
  readonly slammed: boolean
  /** Show win highlights now (reels at rest on a result). */
  readonly showHighlights: boolean
  /** Changes whenever a new spin lands, to restart highlight cycling. */
  readonly spinKey: string
  readonly reducedMotion: boolean
  readonly timing: SlotTiming

  readonly balance: number
  readonly win: number
  readonly bet: number
  readonly betLevel: number
  readonly betOptions: readonly number[]
  readonly canChangeBet: boolean
  readonly cannotAffordBet: boolean
  readonly canClaimFreePearls: boolean
  readonly freePearlsGrant: number
  readonly minBet: number
  readonly history: readonly HistoryEntry[]

  readonly spinButton: SpinButtonMode
  /** The Spin button does something right now (spin or slam stop). */
  readonly spinEnabled: boolean
  readonly feature: FeatureView | null
  readonly featureActive: boolean
  readonly bigWin: { readonly pearls: number; readonly times: number } | null
  readonly announcement: string

  pressSpin(): void
  setBetLevel(level: number): void
  claimFreePearls(): void
  skipFeature(): void
  continueAfterFeature(): void
}

function spinButtonMode(state: SlotState): SpinButtonMode {
  if (inFeature(state)) return 'freespins'
  if (isReelsMoving(state)) return 'stop'
  const showingBaseWin = state.phase === 'SHOWING_WINS' && !state.round?.result.feature
  if ((state.phase === 'IDLE' || showingBaseWin) && canAfford(state.balance, currentBet(state))) return 'idle'
  return 'disabled'
}

export function useSlotMachine(): SlotMachine {
  const reducedMotion = usePrefersReducedMotion()
  const timing = reducedMotion ? REDUCED_MOTION_TIMING : NORMAL_TIMING
  const [state, setState] = useState<SlotState>(() => createInitialState(loadSlotData()))
  // Source of truth for event handlers, so two quick presses can never both see IDLE
  // (which would call spin() twice).
  const stateRef = useRef(state)
  const rngRef = useRef<Rng | null>(null)

  const act = useCallback((action: SlotAction) => {
    const next = slotReducer(stateRef.current, action)
    if (next !== stateRef.current) {
      stateRef.current = next
      setState(next)
    }
  }, [])

  // Drive the machine: each state schedules its own next step.
  useEffect(() => {
    const step = nextAutoStep(state, timing)
    if (!step) return
    const id = setTimeout(() => act(step.action), step.delayMs)
    return () => clearTimeout(id)
  }, [state, timing, act])

  // Persist wallet, bet and history (settled values only).
  useEffect(() => {
    saveSlotData({ balance: state.balance, betLevel: state.betLevel, history: state.history })
  }, [state.balance, state.betLevel, state.history])

  const pressSpin = useCallback(() => {
    const current = stateRef.current
    if (isReelsMoving(current)) {
      act({ type: 'SLAM_STOP' })
      return
    }
    // Pressing Spin while a plain base win is on show ends the display and spins again.
    if (current.phase === 'SHOWING_WINS' && current.freeSpinIndex === null && !current.round?.result.feature) {
      act({ type: 'WINS_DONE' })
    }
    if (!canSpin(stateRef.current)) return
    rngRef.current ??= createGameRng()
    // The outcome is decided here, once, before any reel moves.
    act({ type: 'SPIN', result: spin(rngRef.current, GAME_MATH) })
  }, [act])

  const setBetLevel = useCallback((level: number) => act({ type: 'SET_BET', level }), [act])
  const claimFreePearls = useCallback(() => act({ type: 'CLAIM_FREE_PEARLS' }), [act])
  const skipFeature = useCallback(() => act({ type: 'SKIP_FEATURE' }), [act])
  const continueAfterFeature = useCallback(() => act({ type: 'END_FEATURE' }), [act])

  const { round, freeSpinIndex } = state
  const reels = useMemo(() => reelSetView(round, freeSpinIndex), [round, freeSpinIndex])

  const moving = isReelsMoving(state)
  const idle = state.phase === 'IDLE'
  return {
    phase: state.phase,
    reels,
    reelsStopped: state.reelsStopped,
    reelsMoving: moving,
    slammed: state.slammed,
    showHighlights: !moving && state.phase !== 'EVALUATING' && state.round !== null,
    spinKey: `${state.round?.id ?? 0}:${state.freeSpinIndex ?? 'base'}`,
    reducedMotion,
    timing,

    balance: displayedBalance(state),
    win: displayedWin(state),
    bet: currentBet(state),
    betLevel: state.betLevel,
    betOptions: BET_LEVELS.map((l) => l.bet),
    canChangeBet: idle,
    cannotAffordBet: idle && !canAfford(state.balance, currentBet(state)),
    canClaimFreePearls: idle && canClaimFreePearls(state.balance),
    freePearlsGrant: FREE_PEARLS_GRANT,
    minBet: MIN_BET,
    history: visibleHistory(state),

    spinButton: spinButtonMode(state),
    spinEnabled: moving || spinButtonMode(state) === 'idle',
    feature: featureView(state),
    featureActive: inFeature(state),
    bigWin: bigWinView(state),
    announcement: announcement(state),

    pressSpin,
    setBetLevel,
    claimFreePearls,
    skipFeature,
    continueAfterFeature,
  }
}
