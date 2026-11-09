/**
 * Presentation helpers: turn the state machine + the decided SpinResult into what the
 * reels and overlays show. Pure. Nothing here decides an outcome; it only reads one.
 */
import { gridFromStops } from '../models/evaluator'
import { ROWS } from '../models/paytable'
import { BASE_STRIPS, FREE_SPIN_STRIPS } from '../models/reelStrips'
import type { Grid, ReelStrip, ReelStrips, SpinResult, SymbolId, WayWin, WildMultipliers } from '../models/types'
import { displayedWin, type Round, type SlotState } from './slotReducer'
import { isBigWin } from './slotTiming'

/** What one cell draws. WHALE is split into joined segments (DECISIONS 2026-11-09). */
export type WhaleSegment = 'WHALE_TOP' | 'WHALE_MID' | 'WHALE_BOTTOM' | 'WHALE_SINGLE'
export type SymbolFace = Exclude<SymbolId, 'WHALE'> | WhaleSegment

function at<T>(items: readonly T[], index: number): T {
  const n = items.length
  return items[((index % n) + n) % n]
}

/**
 * Which whale segment to draw at `index` of a strip, from its neighbours on the strip
 * (wrapping). This includes the cells just above and below the visible window, so a
 * stack cut by the window edge still looks joined. Presentation only.
 */
export function whaleSegment(strip: ReelStrip, index: number): WhaleSegment {
  const above = at(strip, index - 1) === 'WHALE'
  const below = at(strip, index + 1) === 'WHALE'
  if (above && below) return 'WHALE_MID'
  if (above) return 'WHALE_BOTTOM'
  if (below) return 'WHALE_TOP'
  return 'WHALE_SINGLE'
}

export function faceAt(strip: ReelStrip, index: number): SymbolFace {
  const symbol = at(strip, index)
  return symbol === 'WHALE' ? whaleSegment(strip, index) : symbol
}

const facesCache = new WeakMap<ReelStrip, readonly SymbolFace[]>()

/** Faces for a whole strip, top to bottom (cached per strip). */
export function stripFaces(strip: ReelStrip): readonly SymbolFace[] {
  let faces = facesCache.get(strip)
  if (!faces) {
    faces = strip.map((_, i) => faceAt(strip, i))
    facesCache.set(strip, faces)
  }
  return faces
}

/** Window shown before the first spin. Not an outcome; just a pleasant first look. */
export const IDLE_STOPS: readonly number[] = [21, 29, 10, 12, 13]

/** True/false per cell, same shape as the grid: grid[reel][row]. */
export type CellMask = readonly (readonly boolean[])[]

/** Cells that make up a way win: the symbol or a wild on each paying reel. */
export function wayWinCells(grid: Grid, win: WayWin): CellMask {
  return grid.map((window, reel) =>
    window.map((s) => reel < win.reels && (s === win.symbol || s === 'WILD')),
  )
}

/** Cells holding a scatter (chest). */
export function scatterCells(grid: Grid): CellMask {
  return grid.map((window) => window.map((s) => s === 'CHEST'))
}

export const SYMBOL_NAMES: Readonly<Record<SymbolId, string>> = {
  WHALE: 'Whale',
  SHARK: 'Shark',
  OCTOPUS: 'Octopus',
  TURTLE: 'Sea Turtle',
  ANGLER: 'Anglerfish',
  PEARL: 'Pearl',
  SHELL: 'Shell',
  STARFISH: 'Starfish',
  ANCHOR: 'Anchor',
  WILD: 'Kraken Eye Wild',
  CHEST: 'Treasure Chest',
}

export interface WinHighlight {
  readonly key: string
  readonly label: string
  readonly cells: CellMask
}

/** What the reel area shows right now. */
export interface ReelSetView {
  readonly mode: 'base' | 'free'
  /** Faces of each reel's whole strip, for the scrolling animation. */
  readonly stripFaces: readonly (readonly SymbolFace[])[]
  /** Top-row index of the landing window on each strip. */
  readonly stops: readonly number[]
  readonly grid: Grid
  /** Per-cell wild multiplier (0 if none), only in free spins. */
  readonly wildMultipliers: WildMultipliers | null
  /** One entry per way win (and the scatter), in order, for cycling highlights. */
  readonly winHighlights: readonly WinHighlight[]
}

function strips(mode: 'base' | 'free'): ReelStrips {
  return mode === 'free' ? FREE_SPIN_STRIPS : BASE_STRIPS
}

/**
 * True when the cap cut the BASE spin's own pay (its ways + scatter add up to more than
 * it paid). `SpinResult.capped` is also true when only the feature hit the cap, which
 * must not hide the base spin's per-way amounts (tester M3 backlog a).
 */
export function baseSpinCapped(result: SpinResult): boolean {
  const parts = result.wayWins.reduce((sum, w) => sum + w.coins, result.scatterWin?.coins ?? 0)
  return parts > result.baseCoins
}

/** What the reels show for a round (null = before the first spin) and free spin index (null = base game). */
export function reelSetView(round: Round | null, freeSpinIndex: number | null): ReelSetView {
  const freeSpin = round && freeSpinIndex !== null ? (round.result.feature?.spins[freeSpinIndex] ?? null) : null
  const mode = freeSpin ? 'free' : 'base'
  const reelStrips = strips(mode)
  const spinResult = freeSpin ?? round?.result ?? null
  const stops = spinResult?.stops ?? IDLE_STOPS
  const grid = spinResult?.grid ?? gridFromStops(reelStrips, stops, ROWS)
  const coinValue = round?.coinValue ?? 1
  // A capped spin pays less than its ways add up to, so per-way amounts are hidden then.
  const capped = freeSpin ? freeSpin.capped : round ? baseSpinCapped(round.result) : false

  const winHighlights: WinHighlight[] = []
  if (spinResult) {
    for (const win of spinResult.wayWins) {
      const amount = capped ? '' : ` · ${(win.coins * coinValue).toLocaleString('en-US')} ✦`
      winHighlights.push({
        key: `way-${win.symbol}`,
        label: `${SYMBOL_NAMES[win.symbol]} × ${win.reels} reels · ${win.ways} ${win.ways === 1 ? 'way' : 'ways'}${amount}`,
        cells: wayWinCells(grid, win),
      })
    }
    const scatter = spinResult.scatterWin
    if (scatter) {
      const amount = capped ? '' : ` · ${(scatter.coins * coinValue).toLocaleString('en-US')} ✦`
      winHighlights.push({
        key: 'scatter',
        label: `${scatter.count} Treasure Chests${amount}`,
        cells: scatterCells(grid),
      })
    }
  }

  return {
    mode,
    stripFaces: reelStrips.map(stripFaces),
    stops,
    grid,
    wildMultipliers: freeSpin ? freeSpin.wildMultipliers : null,
    winHighlights,
  }
}

/** Data for the free-spins banner and its intro/outro panels. */
export interface FeatureView {
  readonly stage: 'intro' | 'playing' | 'outro'
  readonly initialSpins: number
  /** 1-based number of the free spin on the reels (0 during the intro). */
  readonly spinNumber: number
  /** Free spins known so far (grows when a retrigger is revealed). */
  readonly totalSpins: number
  /** Spins added by the free spin on the reels, once revealed. */
  readonly retriggerSpins: number
  /** Feature win revealed so far (excludes the triggering base spin), in Pearls. */
  readonly featureWinPearls: number
  /** Whole round (base + feature) revealed so far, in Pearls. */
  readonly roundWinPearls: number
  readonly cappedShown: boolean
}

const REVEALED_PHASES = new Set(['SHOWING_WINS', 'FREE_SPINS_OUTRO', 'IDLE'])

export function featureView(state: SlotState): FeatureView | null {
  const round = state.round
  const feature = round?.result.feature
  if (!round || !feature) return null
  const roundWinPearls = displayedWin(state)
  const featureWinPearls = Math.max(0, state.revealedCoins - round.result.baseCoins) * round.coinValue

  if (state.phase === 'FREE_SPINS_INTRO') {
    return {
      stage: 'intro',
      initialSpins: feature.initialSpins,
      spinNumber: 0,
      totalSpins: feature.initialSpins,
      retriggerSpins: 0,
      featureWinPearls,
      roundWinPearls,
      cappedShown: false,
    }
  }
  if (state.phase === 'FREE_SPINS_OUTRO') {
    return {
      stage: 'outro',
      initialSpins: feature.initialSpins,
      spinNumber: feature.spins.length,
      totalSpins: feature.spins.length,
      retriggerSpins: 0,
      featureWinPearls: feature.totalCoins * round.coinValue,
      roundWinPearls: round.winPearls,
      cappedShown: feature.endedByCap,
    }
  }
  if (state.freeSpinIndex === null) return null

  const spin = feature.spins[state.freeSpinIndex]
  const revealed = REVEALED_PHASES.has(state.phase)
  const retriggerSpins = revealed ? spin.retriggerSpins : 0
  const remaining = revealed ? spin.spinsRemaining : spin.spinsRemaining - spin.retriggerSpins
  return {
    stage: 'playing',
    initialSpins: feature.initialSpins,
    spinNumber: spin.index,
    totalSpins: spin.index + Math.max(0, remaining),
    retriggerSpins,
    featureWinPearls,
    roundWinPearls,
    cappedShown: revealed && spin.capped,
  }
}

/** Big-win overlay data, or null. */
export function bigWinView(state: SlotState): { readonly pearls: number; readonly times: number } | null {
  if (!isBigWin(state) || !state.round) return null
  const pearls = state.round.result.baseCoins * state.round.coinValue
  return { pearls, times: Math.floor(pearls / state.round.bet) }
}

const fmt = (n: number) => n.toLocaleString('en-US')

/**
 * The line under the reels while wins cycle: every win together ('all') shows how many
 * wins and what the spin paid; each single step shows that win's own label.
 * `spinWinPearls` is what the spin on the reels paid (after any cap).
 */
export function winLabel(
  highlights: readonly WinHighlight[],
  step: 'all' | number,
  spinWinPearls: number,
): string {
  if (highlights.length === 0) return ''
  if (step !== 'all') return highlights[step]?.label ?? ''
  if (highlights.length === 1) return highlights[0].label
  return `${highlights.length} wins · ${fmt(spinWinPearls)} ✦`
}

/** Text for the aria-live region. Empty while nothing new is known. */
export function announcement(state: SlotState): string {
  const round = state.round
  if (!round) return ''
  const feature = featureView(state)
  switch (state.phase) {
    case 'SPINNING':
    case 'STOPPING':
    case 'EVALUATING':
      return state.freeSpinIndex === null ? 'Spinning.' : `Free spin ${feature?.spinNumber ?? ''}.`
    case 'SHOWING_WINS': {
      if (state.freeSpinIndex !== null && feature) {
        const re = feature.retriggerSpins > 0 ? ` Plus ${feature.retriggerSpins} free spins!` : ''
        return `Free spin ${feature.spinNumber} win. Feature total ${fmt(feature.featureWinPearls)} Pearls.${re}`
      }
      const big = isBigWin(state) ? 'Big win! ' : ''
      return `${big}You won ${fmt(displayedWin(state))} Pearls.`
    }
    case 'FREE_SPINS_INTRO':
      return `${round.result.feature?.initialSpins ?? 0} free spins triggered!`
    case 'FREE_SPINS_OUTRO':
      return `Free spins finished. Total win ${fmt(round.winPearls)} Pearls.`
    case 'IDLE':
      return round.winPearls > 0 ? `You won ${fmt(round.winPearls)} Pearls.` : 'No win.'
  }
}
