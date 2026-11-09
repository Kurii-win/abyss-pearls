/**
 * Scatter anticipation (presentation only). When at least ANTICIPATION_CHESTS Treasure
 * Chests are already visible on stopped reels and more reels are still spinning, the
 * remaining reels spin a little longer with a glow.
 *
 * Everything here is read from the SpinResult the model has already decided: the grid
 * is known before the first reel moves, so anticipation can never change an outcome.
 * It only changes when the View reveals each reel.
 */
import { REELS } from '../models/paytable'
import type { Grid } from '../models/types'
import { isReelsMoving, type SlotState } from './slotReducer'

/** Chests needed on stopped reels before the rest of the reels "tease". */
export const ANTICIPATION_CHESTS = 2

function chestsOn(grid: Grid, reel: number): number {
  return grid[reel]?.filter((s) => s === 'CHEST').length ?? 0
}

/**
 * Index of the first reel that anticipates, or null: the first reel r < REELS such
 * that reels 0..r-1 (all stopped before it) show at least ANTICIPATION_CHESTS chests.
 * Every reel from there to the last anticipates too.
 */
export function anticipationStart(grid: Grid, minChests = ANTICIPATION_CHESTS): number | null {
  let chests = 0
  for (let r = 0; r < REELS; r++) {
    if (chests >= minChests) return r
    chests += chestsOn(grid, r)
  }
  return null
}

/** The grid of the spin currently on the reels (base spin or one free spin); null before the first spin. */
export function gridOnReels(state: SlotState): Grid | null {
  const round = state.round
  if (!round) return null
  if (state.freeSpinIndex === null) return round.result.grid
  return round.result.feature?.spins[state.freeSpinIndex]?.grid ?? null
}

/** Chests visible on the reels that have already stopped. */
export function chestsOnStoppedReels(state: SlotState): number {
  const grid = gridOnReels(state)
  if (!grid) return 0
  let n = 0
  for (let r = 0; r < Math.min(state.reelsStopped, REELS); r++) n += chestsOn(grid, r)
  return n
}

/** Reel `reel` will spin longer before it stops (decided from the known grid). Off after a slam stop. */
export function reelAnticipates(state: SlotState, reel: number): boolean {
  if (state.slammed) return false
  const grid = gridOnReels(state)
  if (!grid) return false
  const start = anticipationStart(grid)
  return start !== null && reel >= start
}

/**
 * Which reels glow right now: still spinning, anticipating, and the chests that justify
 * it are already on screen (so the glow never gives away more than the player can see).
 */
export function anticipatingReels(state: SlotState): readonly boolean[] {
  const moving = isReelsMoving(state)
  const grid = gridOnReels(state)
  const start = grid && !state.slammed ? anticipationStart(grid) : null
  return Array.from(
    { length: REELS },
    (_, r) => moving && start !== null && state.reelsStopped >= start && r >= state.reelsStopped,
  )
}
