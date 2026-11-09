/**
 * The spin state machine (CLAUDE.md §4). Pure: no timers, no RNG, no storage.
 *
 *   IDLE → SPINNING → STOPPING (reel by reel) → EVALUATING → SHOWING_WINS → IDLE
 *                                                          ↘ FREE_SPINS_INTRO
 *        → [SPINNING → STOPPING → EVALUATING → SHOWING_WINS] × each free spin
 *        → FREE_SPINS_OUTRO → IDLE
 *
 * Rule 4: the SPIN action carries a SpinResult that the model already computed. Nothing
 * here (or after it) can change that result; every later action only moves the
 * presentation forward through it.
 *
 * Money: the round is settled the moment it starts (bet debited and the whole decided
 * win credited, like a real game server). `revealedCoins` tracks how much of that win
 * the player has been shown, so the displayed balance can count up as the reels reveal it.
 */
import { REELS } from '../models/paytable'
import type { SpinResult } from '../models/types'
import {
  BET_LEVELS,
  canAfford,
  canClaimFreePearls,
  claimFreePearls,
  isBetLevel,
  settleSpin,
  winToPearls,
} from '../models/wallet'

export type SlotPhase =
  | 'IDLE'
  | 'SPINNING'
  | 'STOPPING'
  | 'EVALUATING'
  | 'SHOWING_WINS'
  | 'FREE_SPINS_INTRO'
  | 'FREE_SPINS_OUTRO'

/** One paid spin and everything it decided. */
export interface Round {
  readonly id: number
  readonly result: SpinResult
  /** Bet and coin value the round was played at (the bet level may change later). */
  readonly bet: number
  readonly coinValue: number
  /** result.totalCoins × coinValue: the whole win, already credited to `balance`. */
  readonly winPearls: number
}

export interface HistoryEntry {
  readonly id: number
  readonly bet: number
  readonly winPearls: number
  /** Free spins played in the round's feature (0 if none). */
  readonly freeSpins: number
  readonly capped: boolean
}

export const HISTORY_LIMIT = 50

export interface SlotState {
  readonly phase: SlotPhase
  /** Settled balance in Pearls (includes the current round's whole win). */
  readonly balance: number
  /** Index into BET_LEVELS. */
  readonly betLevel: number
  /** The current or most recent round; null before the first spin. */
  readonly round: Round | null
  /** Which free spin is on the reels; null in the base game. */
  readonly freeSpinIndex: number | null
  /** Reels stopped so far on the spin being shown, left to right (0..REELS). */
  readonly reelsStopped: number
  /** True if the player slam-stopped the spin being shown. */
  readonly slammed: boolean
  /** Coins of the current round revealed to the player so far. */
  readonly revealedCoins: number
  /** Newest first, at most HISTORY_LIMIT entries. */
  readonly history: readonly HistoryEntry[]
}

export type SlotAction =
  | { readonly type: 'SPIN'; readonly result: SpinResult }
  | { readonly type: 'STOP_REEL' }
  | { readonly type: 'SLAM_STOP' }
  | { readonly type: 'REVEAL' }
  | { readonly type: 'WINS_DONE' }
  | { readonly type: 'START_FREE_SPINS' }
  | { readonly type: 'SKIP_FEATURE' }
  | { readonly type: 'END_FEATURE' }
  | { readonly type: 'SET_BET'; readonly level: number }
  | { readonly type: 'CLAIM_FREE_PEARLS' }

export interface InitialSlotData {
  readonly balance: number
  readonly betLevel: number
  readonly history: readonly HistoryEntry[]
}

export function createInitialState(data: InitialSlotData): SlotState {
  return {
    phase: 'IDLE',
    balance: data.balance,
    betLevel: isBetLevel(data.betLevel) ? data.betLevel : 0,
    round: null,
    freeSpinIndex: null,
    reelsStopped: REELS,
    slammed: false,
    revealedCoins: 0,
    history: data.history.slice(0, HISTORY_LIMIT),
  }
}

// ---------------------------------------------------------------- selectors

export function currentBet(state: SlotState): number {
  return BET_LEVELS[state.betLevel].bet
}

/** A new paid spin is allowed: idle and the bet is affordable. */
export function canSpin(state: SlotState): boolean {
  return state.phase === 'IDLE' && canAfford(state.balance, currentBet(state))
}

export function isReelsMoving(state: SlotState): boolean {
  return state.phase === 'SPINNING' || state.phase === 'STOPPING'
}

export function inFeature(state: SlotState): boolean {
  return (
    state.freeSpinIndex !== null || state.phase === 'FREE_SPINS_INTRO' || state.phase === 'FREE_SPINS_OUTRO'
  )
}

/** Coins of the spin currently on the reels (base spin or one free spin). */
export function currentSpinCoins(state: SlotState): number {
  const round = state.round
  if (!round) return 0
  if (state.freeSpinIndex === null) return round.result.baseCoins
  return round.result.feature?.spins[state.freeSpinIndex]?.coins ?? 0
}

/** Balance as the player should see it: the settled balance minus the win not yet revealed. */
export function displayedBalance(state: SlotState): number {
  if (!state.round) return state.balance
  const hidden = state.round.winPearls - state.revealedCoins * state.round.coinValue
  return state.balance - hidden
}

/** Win shown in the win well, in Pearls. */
export function displayedWin(state: SlotState): number {
  return state.round ? state.revealedCoins * state.round.coinValue : 0
}

/** History without the round still being revealed (so it cannot spoil the result). */
export function visibleHistory(state: SlotState): readonly HistoryEntry[] {
  return state.phase === 'IDLE' ? state.history : state.history.slice(1)
}

// ---------------------------------------------------------------- reducer

function startSpin(state: SlotState, result: SpinResult): SlotState {
  if (!canSpin(state)) return state
  const level = BET_LEVELS[state.betLevel]
  const winPearls = winToPearls(result.totalCoins, level.coinValue)
  const id = (state.history[0]?.id ?? (state.round?.id ?? 0)) + 1
  const entry: HistoryEntry = {
    id,
    bet: level.bet,
    winPearls,
    freeSpins: result.feature?.spins.length ?? 0,
    capped: result.capped,
  }
  return {
    ...state,
    phase: 'SPINNING',
    balance: settleSpin(state.balance, level.bet, winPearls),
    round: { id, result, bet: level.bet, coinValue: level.coinValue, winPearls },
    freeSpinIndex: null,
    reelsStopped: 0,
    slammed: false,
    revealedCoins: 0,
    history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
  }
}

/** Leave the spin on the reels once its wins (if any) have been shown. */
function finishSpinDisplay(state: SlotState): SlotState {
  const round = state.round
  if (!round) return state
  const feature = round.result.feature
  if (state.freeSpinIndex === null) {
    if (feature) return { ...state, phase: 'FREE_SPINS_INTRO' }
    return { ...state, phase: 'IDLE', revealedCoins: round.result.totalCoins }
  }
  const spins = feature?.spins ?? []
  const next = state.freeSpinIndex + 1
  if (next < spins.length) {
    return { ...state, phase: 'SPINNING', freeSpinIndex: next, reelsStopped: 0, slammed: false }
  }
  return { ...state, phase: 'FREE_SPINS_OUTRO', revealedCoins: round.result.totalCoins }
}

function reveal(state: SlotState): SlotState {
  const round = state.round
  if (!round) return state
  const revealedCoins =
    state.freeSpinIndex === null
      ? round.result.baseCoins
      : (round.result.feature?.spins[state.freeSpinIndex]?.runningTotalCoins ?? state.revealedCoins)
  const next = { ...state, revealedCoins }
  return currentSpinCoins(state) > 0 ? { ...next, phase: 'SHOWING_WINS' } : finishSpinDisplay(next)
}

export function slotReducer(state: SlotState, action: SlotAction): SlotState {
  switch (action.type) {
    case 'SPIN':
      return startSpin(state, action.result)

    case 'STOP_REEL': {
      if (!isReelsMoving(state)) return state
      const reelsStopped = state.reelsStopped + 1
      return { ...state, reelsStopped, phase: reelsStopped >= REELS ? 'EVALUATING' : 'STOPPING' }
    }

    case 'SLAM_STOP':
      if (!isReelsMoving(state)) return state
      return { ...state, reelsStopped: REELS, phase: 'EVALUATING', slammed: true }

    case 'REVEAL':
      return state.phase === 'EVALUATING' ? reveal(state) : state

    case 'WINS_DONE':
      return state.phase === 'SHOWING_WINS' ? finishSpinDisplay(state) : state

    case 'START_FREE_SPINS': {
      if (state.phase !== 'FREE_SPINS_INTRO' || !state.round?.result.feature) return state
      if (state.round.result.feature.spins.length === 0) {
        return { ...state, phase: 'FREE_SPINS_OUTRO', revealedCoins: state.round.result.totalCoins }
      }
      return { ...state, phase: 'SPINNING', freeSpinIndex: 0, reelsStopped: 0, slammed: false }
    }

    case 'SKIP_FEATURE': {
      const feature = state.round?.result.feature
      if (!state.round || !feature || state.phase === 'FREE_SPINS_OUTRO' || !inFeature(state)) return state
      return {
        ...state,
        phase: 'FREE_SPINS_OUTRO',
        freeSpinIndex: feature.spins.length > 0 ? feature.spins.length - 1 : null,
        reelsStopped: REELS,
        revealedCoins: state.round.result.totalCoins,
      }
    }

    case 'END_FEATURE':
      if (state.phase !== 'FREE_SPINS_OUTRO' || !state.round) return state
      return {
        ...state,
        phase: 'IDLE',
        freeSpinIndex: null,
        reelsStopped: REELS,
        revealedCoins: state.round.result.totalCoins,
      }

    case 'SET_BET':
      if (state.phase !== 'IDLE' || !isBetLevel(action.level)) return state
      return { ...state, betLevel: action.level }

    case 'CLAIM_FREE_PEARLS':
      if (state.phase !== 'IDLE' || !canClaimFreePearls(state.balance)) return state
      return { ...state, balance: claimFreePearls(state.balance) }

    default:
      return state
  }
}
