import { describe, expect, it } from 'vitest'
import {
  announcement,
  bigWinView,
  faceAt,
  featureView,
  reelSetView,
  scatterCells,
  stripFaces,
  wayWinCells,
  whaleSegment,
} from '../../src/controllers/reelPresentation'
import { createInitialState, slotReducer, type SlotAction, type SlotState } from '../../src/controllers/slotReducer'
import { BASE_STRIPS, FREE_SPIN_STRIPS } from '../../src/models/reelStrips'
import type { ReelStrip, WayWin } from '../../src/models/types'
import { grid } from './gridHelpers'
import { BASE_WIN, BIG_WIN, cappedFeatureResult, FEATURE, RETRIGGER } from './slotFixtures'

const W = 'WHALE' as const
const P = 'PEARL' as const

describe('whaleSegment (stacked whale art, presentation only)', () => {
  it('single whale', () => {
    expect(whaleSegment([P, W, P], 1)).toBe('WHALE_SINGLE')
  })

  it('stack of 2: top then bottom', () => {
    const strip: ReelStrip = [P, W, W, P]
    expect(whaleSegment(strip, 1)).toBe('WHALE_TOP')
    expect(whaleSegment(strip, 2)).toBe('WHALE_BOTTOM')
  })

  it('stack of 3: top, mid, bottom', () => {
    const strip: ReelStrip = [P, W, W, W, P]
    expect([1, 2, 3].map((i) => whaleSegment(strip, i))).toEqual(['WHALE_TOP', 'WHALE_MID', 'WHALE_BOTTOM'])
  })

  it('uses neighbours outside the visible window and wraps around the strip end', () => {
    // Window at stop 0 shows [W, P, P]; the whale above it (last strip cell) joins it.
    const strip: ReelStrip = [W, P, P, P, W]
    expect(whaleSegment(strip, 0)).toBe('WHALE_BOTTOM')
    expect(whaleSegment(strip, 4)).toBe('WHALE_TOP')
    expect(whaleSegment(strip, -1)).toBe('WHALE_TOP')
  })

  it('a window cutting a stack still joins it to the hidden part', () => {
    // Stack at 21..23 on reel 1; a window starting at 22 shows mid, bottom.
    const reel1 = BASE_STRIPS[0]
    expect(faceAt(reel1, 22)).toBe('WHALE_MID')
    expect(faceAt(reel1, 23)).toBe('WHALE_BOTTOM')
    expect(faceAt(reel1, 21)).toBe('WHALE_TOP')
  })

  it('never shows a broken stack on the real strips', () => {
    for (const strip of [...BASE_STRIPS, ...FREE_SPIN_STRIPS]) {
      const faces = stripFaces(strip)
      faces.forEach((face, i) => {
        const next = faces[(i + 1) % faces.length]
        const continues = face === 'WHALE_TOP' || face === 'WHALE_MID'
        expect(continues ? next === 'WHALE_MID' || next === 'WHALE_BOTTOM' : true).toBe(true)
        if (strip[i] !== 'WHALE') expect(face).toBe(strip[i])
      })
    }
  })
})

describe('win cells', () => {
  const g = grid('SH PE AC', 'PE SH WI', 'SH SE PE', 'CH ST ST', 'AC AC AC')
  const sharkWin: WayWin = {
    symbol: 'SHARK', reels: 3, matchesPerReel: [1, 2, 1], ways: 2, coinsPerWay: 75, multipliedWays: 2, coins: 150,
  }

  it('marks the symbol and wilds on the paying reels only', () => {
    expect(wayWinCells(g, sharkWin)).toEqual([
      [true, false, false],
      [false, true, true],
      [true, false, false],
      [false, false, false],
      [false, false, false],
    ])
  })

  it('marks scatters anywhere', () => {
    expect(scatterCells(g)[3]).toEqual([true, false, false])
  })
})

const fresh = () => createInitialState({ balance: 10_000, betLevel: 0, history: [] })
const STOP_ALL: SlotAction[] = Array.from({ length: 5 }, () => ({ type: 'STOP_REEL' }) as const)
const run = (s: SlotState, ...a: SlotAction[]) => a.reduce(slotReducer, s)

describe('reelSetView', () => {
  it('shows base strips and an idle window before the first spin', () => {
    const v = reelSetView(null, null)
    expect(v.mode).toBe('base')
    expect(v.stripFaces).toHaveLength(5)
    expect(v.winHighlights).toEqual([])
    expect(v.wildMultipliers).toBeNull()
  })

  it('lands on the result stops and lists one highlight per win', () => {
    const s = slotReducer(fresh(), { type: 'SPIN', result: BASE_WIN })
    const v = reelSetView(s.round, s.freeSpinIndex)
    expect(v.stops).toEqual(BASE_WIN.stops)
    expect(v.grid).toBe(BASE_WIN.grid)
    expect(v.winHighlights).toHaveLength(BASE_WIN.wayWins.length + (BASE_WIN.scatterWin ? 1 : 0))
  })

  it('switches to free-spin strips, grid and wild multipliers during the feature', () => {
    const s = run(fresh(), { type: 'SPIN', result: FEATURE }, ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' }, { type: 'START_FREE_SPINS' })
    const v = reelSetView(s.round, s.freeSpinIndex)
    const spin0 = FEATURE.feature!.spins[0]
    expect(v.mode).toBe('free')
    expect(v.stripFaces[0]).toHaveLength(FREE_SPIN_STRIPS[0].length)
    expect(v.stops).toEqual(spin0.stops)
    expect(v.wildMultipliers).toBe(spin0.wildMultipliers)
  })

  it('hides per-way amounts on a capped spin', () => {
    const capped = cappedFeatureResult()
    let s = run(fresh(), { type: 'SPIN', result: capped }, ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' }, { type: 'START_FREE_SPINS' })
    s = run(s, ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' })
    const v = reelSetView(s.round, s.freeSpinIndex)
    expect(s.round!.result.feature!.spins[1].capped).toBe(true)
    for (const h of v.winHighlights) expect(h.label).not.toMatch(/✦/)
  })
})

describe('featureView', () => {
  it('counts free spins and reveals a retrigger only after the spin lands', () => {
    const feature = RETRIGGER.feature!
    const i = feature.spins.findIndex((x) => x.retriggerSpins > 0)
    let s = run(fresh(), { type: 'SPIN', result: RETRIGGER }, ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' })
    expect(featureView(s)).toMatchObject({ stage: 'intro', initialSpins: 8, totalSpins: 8 })
    s = slotReducer(s, { type: 'START_FREE_SPINS' })
    for (let k = 0; k < i; k++) {
      s = run(s, ...STOP_ALL, { type: 'REVEAL' })
      if (s.phase === 'SHOWING_WINS') s = slotReducer(s, { type: 'WINS_DONE' })
    }
    expect(featureView(s)).toMatchObject({ stage: 'playing', spinNumber: i + 1, totalSpins: 8, retriggerSpins: 0 })
    s = run(s, ...STOP_ALL, { type: 'REVEAL' })
    expect(featureView(s)).toMatchObject({ spinNumber: i + 1, totalSpins: 13, retriggerSpins: 5 })
  })

  it('reports the paid feature total in the outro, in Pearls at the coin value', () => {
    let s = createInitialState({ balance: 10_000, betLevel: 1, history: [] })
    s = run(s, { type: 'SPIN', result: FEATURE }, ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' }, { type: 'SKIP_FEATURE' })
    expect(featureView(s)).toMatchObject({
      stage: 'outro',
      featureWinPearls: FEATURE.feature!.totalCoins * 2,
      roundWinPearls: FEATURE.totalCoins * 2,
    })
    expect(announcement(s)).toContain((FEATURE.totalCoins * 2).toLocaleString('en-US'))
  })

  it('is null outside a feature', () => {
    expect(featureView(fresh())).toBeNull()
  })
})

describe('bigWinView and announcement', () => {
  it('flags a base win of 20× bet or more', () => {
    const s = run(fresh(), { type: 'SPIN', result: BIG_WIN }, { type: 'SLAM_STOP' }, { type: 'REVEAL' })
    expect(bigWinView(s)).toEqual({ pearls: BIG_WIN.baseCoins, times: Math.floor(BIG_WIN.baseCoins / 25) })
    expect(announcement(s)).toMatch(/^Big win!/)
  })

  it('does not flag a small win, and announces it', () => {
    const s = run(fresh(), { type: 'SPIN', result: BASE_WIN }, { type: 'SLAM_STOP' }, { type: 'REVEAL' })
    expect(bigWinView(s)).toBeNull()
    expect(announcement(s)).toBe('You won 50 Pearls.')
  })
})
