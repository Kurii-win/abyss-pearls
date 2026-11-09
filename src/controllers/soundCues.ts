/**
 * Sound cues: a pure mapping from one state-machine transition (prev → next) to the
 * presentation events a sound player should react to. The controller emits them; the
 * View-side SoundDirector (src/views/audio/) decides what each one sounds like.
 *
 * Controllers cannot import views, so this is the whole contract between the two:
 * a typed list of cues. Nothing here can affect an outcome; it only describes what
 * the player is being shown.
 */
import { COINS_PER_BET, REELS } from '../models/paytable'
import { anticipatingReels, chestsOnStoppedReels } from './anticipation'
import { currentSpinCoins, isReelsMoving, type SlotState } from './slotReducer'
import { isBigWin } from './slotTiming'

/** Base-game or free-spin wins of at least this many × bet get the fuller win sound. */
export const MEDIUM_WIN_X = 5

export type SoundCue =
  | { readonly kind: 'spinStart'; readonly free: boolean }
  /** `reel` is 0-based; the director steps the pitch per reel. */
  | { readonly kind: 'reelStop'; readonly reel: number; readonly slam: boolean }
  /** A stopped reel showed chests; `chests` = chests visible on stopped reels so far. */
  | { readonly kind: 'scatterLand'; readonly chests: number }
  | { readonly kind: 'anticipation' }
  | { readonly kind: 'win'; readonly tier: 'small' | 'medium' }
  | { readonly kind: 'bigWin' }
  | { readonly kind: 'retrigger'; readonly spins: number }
  | { readonly kind: 'featureIntro' }
  | { readonly kind: 'featureOutro' }
  /** A UI control (bet chip, skip, continue, free Pearls) was used. */
  | { readonly kind: 'click' }

export type SoundCueKind = SoundCue['kind']

function sameSpin(a: SlotState, b: SlotState): boolean {
  return a.round === b.round && a.freeSpinIndex === b.freeSpinIndex
}

function entered(prev: SlotState, next: SlotState, phase: SlotState['phase']): boolean {
  return next.phase === phase && (prev.phase !== phase || !sameSpin(prev, next))
}

/** Cues for one transition, in the order they should sound. Pure. */
export function cuesForTransition(prev: SlotState, next: SlotState): SoundCue[] {
  if (prev === next) return []
  const cues: SoundCue[] = []

  if (entered(prev, next, 'SPINNING')) {
    cues.push({ kind: 'spinStart', free: next.freeSpinIndex !== null })
  }

  // Reels landing on the same spin (not a feature skip, which jumps past them).
  const landing = next.phase === 'STOPPING' || next.phase === 'EVALUATING'
  if (landing && sameSpin(prev, next) && isReelsMoving(prev) && next.reelsStopped > prev.reelsStopped) {
    for (let r = prev.reelsStopped; r < Math.min(next.reelsStopped, REELS); r++) {
      cues.push({ kind: 'reelStop', reel: r, slam: next.slammed })
    }
    const chests = chestsOnStoppedReels(next)
    if (chests > chestsOnStoppedReels(prev)) cues.push({ kind: 'scatterLand', chests })
    if (anticipatingReels(next).some(Boolean) && !anticipatingReels(prev).some(Boolean)) {
      cues.push({ kind: 'anticipation' })
    }
  }

  if (entered(prev, next, 'SHOWING_WINS')) {
    if (isBigWin(next)) {
      cues.push({ kind: 'bigWin' })
    } else {
      const coins = currentSpinCoins(next)
      cues.push({ kind: 'win', tier: coins >= MEDIUM_WIN_X * COINS_PER_BET ? 'medium' : 'small' })
    }
    const spin = next.freeSpinIndex === null ? null : next.round?.result.feature?.spins[next.freeSpinIndex]
    if (spin && spin.retriggerSpins > 0) cues.push({ kind: 'retrigger', spins: spin.retriggerSpins })
  }

  if (entered(prev, next, 'FREE_SPINS_INTRO')) cues.push({ kind: 'featureIntro' })
  if (entered(prev, next, 'FREE_SPINS_OUTRO')) cues.push({ kind: 'featureOutro' })

  return cues
}
