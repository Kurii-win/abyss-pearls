/**
 * The one hook the Play page talks to. Owns everything impure around the pure state
 * machine: the RNG, timers (reel stop cadence, win display, free-spin auto-play),
 * localStorage persistence and reduced-motion detection.
 *
 * Rule 4 (Model decides, View performs): `pressSpin` calls the model's spin() exactly
 * once per accepted spin, BEFORE any animation, and hands the SpinResult to the reducer.
 * Views only receive derived, read-only data and intent callbacks; they never see the
 * RNG and cannot influence an outcome.
 *
 * Sound: every transition is mapped to presentation cues (soundCues.ts) and pushed to
 * subscribers (the View's SoundDirector). The controller never touches audio itself.
 *
 * Several tabs: the wallet is shared through localStorage, and every save carries a
 * monotonic revision (walletStorage.ts). This tab remembers the newest revision it has
 * seen or written (`revRef`) and:
 *   - persists every settlement synchronously, inside the same handler that settled it;
 *   - re-reads storage synchronously right before settling anything (Spin, bet change,
 *     free Pearls) and adopts a newer wallet first, so it never settles on a stale balance;
 *   - adopts a newer wallet from a `storage` event when IDLE, or on returning to IDLE by
 *     re-reading storage then (never a remembered, possibly stale, copy).
 * Known limitation: two tabs pressing Spin within the same storage-event window (a few
 * ms, before either sees the other's save) is last-writer-wins: one round's settlement
 * can be overwritten. Recorded in DECISIONS.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Rng } from '../models/rng'
import { GAME_MATH, spin } from '../models/spin'
import { BET_LEVELS, canAfford, canClaimFreePearls, FREE_PEARLS_GRANT, MIN_BET } from '../models/wallet'
import { anticipatingReels } from './anticipation'
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
  currentSpinCoins,
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
import { cuesForTransition, type SoundCue } from './soundCues'
import { isBigWin, NORMAL_TIMING, nextAutoStep, REDUCED_MOTION_TIMING, type SlotTiming } from './slotTiming'
import { usePrefersReducedMotion } from './useMediaQuery'
import { isNewerRev, loadSlotData, nextRev, parseSlotDataText, saveSlotData, STORAGE_KEY } from './walletStorage'

/** Which art the Spin button shows. */
export type SpinButtonMode = 'idle' | 'stop' | 'disabled' | 'freespins'

/** Why the bet chips are locked right now (null = they are not). */
export type BetLock = 'feature' | 'round' | null

export type SoundCueListener = (cues: readonly SoundCue[]) => void

export interface SlotMachine {
  readonly phase: SlotPhase
  readonly reels: ReelSetView
  /** Reels (from the left) that have landed on the spin being shown. */
  readonly reelsStopped: number
  readonly reelsMoving: boolean
  readonly slammed: boolean
  /** Per reel: spinning longer because chests on stopped reels may complete a trigger. */
  readonly anticipating: readonly boolean[]
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
  readonly betLock: BetLock
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
  /** What the spin on the reels paid, in Pearls (after any cap). */
  readonly spinWinPearls: number
  readonly announcement: string
  /** The wallet was just updated from another open tab. */
  readonly syncedFromOtherTab: boolean

  pressSpin(): void
  setBetLevel(level: number): void
  claimFreePearls(): void
  skipFeature(): void
  continueAfterFeature(): void
  /** End the big-win celebration early (tap or Space). */
  skipBigWin(): void
  /** Listen for presentation sound cues; returns the unsubscribe function. */
  subscribeCues(listener: SoundCueListener): () => void
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
  const [initialData] = useState(() => loadSlotData())
  const [state, setState] = useState<SlotState>(() => createInitialState(initialData))
  // Source of truth for event handlers, so two quick presses can never both see IDLE
  // (which would call spin() twice).
  const stateRef = useRef(state)
  const rngRef = useRef<Rng | null>(null)
  const cueListeners = useRef(new Set<SoundCueListener>())
  /** Newest wallet revision this tab has seen or written. */
  const revRef = useRef(initialData.rev)
  const [syncedFromOtherTab, setSyncedFromOtherTab] = useState(false)

  const emit = useCallback((cues: readonly SoundCue[]) => {
    if (cues.length === 0) return
    for (const listener of cueListeners.current) listener(cues)
  }, [])

  const subscribeCues = useCallback((listener: SoundCueListener) => {
    cueListeners.current.add(listener)
    return () => {
      cueListeners.current.delete(listener)
    }
  }, [])

  /** Save the settled wallet now, with a revision newer than anything seen. */
  const persist = useCallback((s: SlotState) => {
    const rev = nextRev(revRef.current, loadSlotData().rev)
    if (saveSlotData({ balance: s.balance, betLevel: s.betLevel, history: s.history, rev })) revRef.current = rev
  }, [])

  const act = useCallback(
    (action: SlotAction) => {
      const prev = stateRef.current
      const next = slotReducer(prev, action)
      if (next !== prev) {
        stateRef.current = next
        setState(next)
        // Settlements (spin, bet, free Pearls) are saved synchronously, in this handler.
        // Adopting another tab's wallet is not a new settlement: nothing to save.
        const walletChanged =
          next.balance !== prev.balance || next.betLevel !== prev.betLevel || next.history !== prev.history
        if (walletChanged && action.type !== 'SYNC_STORAGE') persist(next)
        emit(cuesForTransition(prev, next))
      }
    },
    [emit, persist],
  )

  /**
   * If this tab is IDLE and storage holds a newer wallet revision, adopt it now.
   * Always reads storage itself, so it can only ever adopt the newest data.
   */
  const syncFromStorage = useCallback(() => {
    if (stateRef.current.phase !== 'IDLE') return
    const stored = loadSlotData()
    if (!isNewerRev(stored.rev, revRef.current)) return
    revRef.current = stored.rev
    const before = stateRef.current
    act({ type: 'SYNC_STORAGE', data: stored })
    if (stateRef.current !== before) setSyncedFromOtherTab(true)
  }, [act])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const data = parseSlotDataText(e.newValue)
      // Stale or equal revisions are dropped; a newer one is adopted now if IDLE, or
      // by the IDLE effect below (which re-reads storage rather than keeping a copy).
      if (!data || !isNewerRev(data.rev, revRef.current)) return
      syncFromStorage()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [syncFromStorage])

  useEffect(() => {
    if (state.phase === 'IDLE') syncFromStorage()
  }, [state.phase, syncFromStorage])

  // Drive the machine: each state schedules its own next step.
  useEffect(() => {
    const step = nextAutoStep(state, timing)
    if (!step) return
    const id = setTimeout(() => act(step.action), step.delayMs)
    return () => clearTimeout(id)
  }, [state, timing, act])

  const pressSpin = useCallback(() => {
    const current = stateRef.current
    if (isReelsMoving(current)) {
      act({ type: 'SLAM_STOP' })
      return
    }
    // The first press during a big-win celebration only skips the celebration.
    if (isBigWin(current)) {
      act({ type: 'WINS_DONE' })
      return
    }
    // Pressing Spin while a plain base win is on show ends the display and spins again.
    if (current.phase === 'SHOWING_WINS' && current.freeSpinIndex === null && !current.round?.result.feature) {
      act({ type: 'WINS_DONE' })
    }
    // Settle on the newest wallet: another tab may have spent or won since we last looked.
    syncFromStorage()
    if (!canSpin(stateRef.current)) return
    rngRef.current ??= createGameRng()
    setSyncedFromOtherTab(false)
    // The outcome is decided here, once, before any reel moves.
    act({ type: 'SPIN', result: spin(rngRef.current, GAME_MATH) })
  }, [act, syncFromStorage])

  /** A UI intent: click feedback, then the action. */
  const intent = useCallback(
    (action: SlotAction) => {
      emit([{ kind: 'click' }])
      act(action)
    },
    [act, emit],
  )
  // Bet and free-Pearls changes are settlements too: re-read storage first.
  const setBetLevel = useCallback(
    (level: number) => {
      syncFromStorage()
      intent({ type: 'SET_BET', level })
    },
    [intent, syncFromStorage],
  )
  const claimFreePearls = useCallback(() => {
    syncFromStorage()
    intent({ type: 'CLAIM_FREE_PEARLS' })
  }, [intent, syncFromStorage])
  const skipFeature = useCallback(() => intent({ type: 'SKIP_FEATURE' }), [intent])
  const continueAfterFeature = useCallback(() => intent({ type: 'END_FEATURE' }), [intent])
  const skipBigWin = useCallback(() => {
    if (isBigWin(stateRef.current)) act({ type: 'WINS_DONE' })
  }, [act])

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
    anticipating: anticipatingReels(state),
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
    betLock: idle ? null : inFeature(state) ? 'feature' : 'round',
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
    spinWinPearls: currentSpinCoins(state) * (state.round?.coinValue ?? 0),
    announcement: announcement(state),
    syncedFromOtherTab,

    pressSpin,
    setBetLevel,
    claimFreePearls,
    skipFeature,
    continueAfterFeature,
    skipBigWin,
    subscribeCues,
  }
}
