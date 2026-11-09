import { describe, expect, it } from 'vitest'
import {
  canSpin,
  createInitialState,
  currentSpinCoins,
  displayedBalance,
  displayedWin,
  HISTORY_LIMIT,
  slotReducer,
  visibleHistory,
  type SlotAction,
  type SlotPhase,
  type SlotState,
} from '../../src/controllers/slotReducer'
import type { SpinResult } from '../../src/models/types'
import { BASE_WIN, cappedFeatureResult, FEATURE, NO_WIN } from './slotFixtures'

const fresh = (balance = 10_000, betLevel = 0) => createInitialState({ balance, betLevel, history: [] })
const run = (state: SlotState, ...actions: SlotAction[]) => actions.reduce(slotReducer, state)
const STOP_ALL: SlotAction[] = Array.from({ length: 5 }, () => ({ type: 'STOP_REEL' }) as const)
const spinOf = (result: SpinResult): SlotAction => ({ type: 'SPIN', result })

const ALL_ACTIONS: SlotAction[] = [
  { type: 'STOP_REEL' },
  { type: 'SLAM_STOP' },
  { type: 'REVEAL' },
  { type: 'WINS_DONE' },
  { type: 'START_FREE_SPINS' },
  { type: 'SKIP_FEATURE' },
  { type: 'END_FEATURE' },
  { type: 'SET_BET', level: 2 },
  { type: 'CLAIM_FREE_PEARLS' },
  { type: 'SPIN', result: BASE_WIN },
]

/** Every action not listed in `allowed` must return the very same state object. */
function expectOnlyAllowed(state: SlotState, allowed: SlotAction['type'][]) {
  for (const action of ALL_ACTIONS) {
    if (allowed.includes(action.type)) continue
    expect(slotReducer(state, action), `${action.type} in ${state.phase}`).toBe(state)
  }
}

/** Play a whole base round (no feature) to IDLE. */
function playRound(state: SlotState, result: SpinResult): SlotState {
  let s = run(state, spinOf(result), ...STOP_ALL, { type: 'REVEAL' })
  if (s.phase === 'SHOWING_WINS') s = slotReducer(s, { type: 'WINS_DONE' })
  return s
}

describe('initial state', () => {
  it('starts IDLE with the given wallet and all reels at rest', () => {
    const s = fresh()
    expect(s.phase).toBe('IDLE')
    expect(s.balance).toBe(10_000)
    expect(s.round).toBeNull()
    expect(canSpin(s)).toBe(true)
    expect(displayedBalance(s)).toBe(10_000)
    expect(displayedWin(s)).toBe(0)
  })

  it('falls back to bet level 0 on a bad level and caps history', () => {
    const history = Array.from({ length: 70 }, (_, i) => ({ id: i + 1, bet: 25, winPearls: 0, freeSpins: 0, capped: false }))
    const s = createInitialState({ balance: 100, betLevel: 9, history })
    expect(s.betLevel).toBe(0)
    expect(s.history).toHaveLength(HISTORY_LIMIT)
  })
})

describe('base round transitions', () => {
  it('IDLE → SPINNING → STOPPING (reel by reel) → EVALUATING → SHOWING_WINS → IDLE', () => {
    const phases: SlotPhase[] = []
    let s = fresh()
    s = slotReducer(s, spinOf(BASE_WIN))
    phases.push(s.phase)
    expect(s.reelsStopped).toBe(0)
    for (let i = 1; i <= 5; i++) {
      s = slotReducer(s, { type: 'STOP_REEL' })
      expect(s.reelsStopped).toBe(i)
      phases.push(s.phase)
    }
    s = slotReducer(s, { type: 'REVEAL' })
    phases.push(s.phase)
    s = slotReducer(s, { type: 'WINS_DONE' })
    phases.push(s.phase)
    expect(phases).toEqual([
      'SPINNING', 'STOPPING', 'STOPPING', 'STOPPING', 'STOPPING', 'EVALUATING', 'SHOWING_WINS', 'IDLE',
    ])
  })

  it('stores the given result unchanged and settles the round at spin time', () => {
    const s = slotReducer(fresh(), spinOf(BASE_WIN))
    expect(s.round?.result).toBe(BASE_WIN)
    expect(s.round).toMatchObject({ bet: 25, coinValue: 1, winPearls: 50 })
    expect(s.balance).toBe(10_000 - 25 + 50)
    // Not revealed yet: the player sees only the bet taken.
    expect(displayedBalance(s)).toBe(9_975)
    expect(displayedWin(s)).toBe(0)
  })

  it('reveals the win on REVEAL and ends with balance = start − bet + win', () => {
    let s = run(fresh(), spinOf(BASE_WIN), ...STOP_ALL, { type: 'REVEAL' })
    expect(displayedWin(s)).toBe(50)
    expect(displayedBalance(s)).toBe(10_025)
    s = slotReducer(s, { type: 'WINS_DONE' })
    expect(s.phase).toBe('IDLE')
    expect(displayedBalance(s)).toBe(s.balance)
  })

  it('a losing spin goes EVALUATING → IDLE with no SHOWING_WINS', () => {
    const s = run(fresh(), spinOf(NO_WIN), ...STOP_ALL, { type: 'REVEAL' })
    expect(s.phase).toBe('IDLE')
    expect(s.balance).toBe(9_975)
    expect(displayedWin(s)).toBe(0)
  })

  it('pays at the coin value of the bet level', () => {
    const s = playRound(fresh(10_000, 3), BASE_WIN)
    expect(s.balance).toBe(10_000 - 250 + 500)
    expect(s.history[0]).toMatchObject({ bet: 250, winPearls: 500 })
  })
})

describe('illegal transitions are ignored', () => {
  it('IDLE accepts only SPIN, SET_BET and CLAIM_FREE_PEARLS', () => {
    expectOnlyAllowed(fresh(), ['SPIN', 'SET_BET', 'CLAIM_FREE_PEARLS'])
  })

  it('SPINNING / STOPPING accept only STOP_REEL and SLAM_STOP', () => {
    const spinning = slotReducer(fresh(), spinOf(BASE_WIN))
    expectOnlyAllowed(spinning, ['STOP_REEL', 'SLAM_STOP'])
    const stopping = slotReducer(spinning, { type: 'STOP_REEL' })
    expect(stopping.phase).toBe('STOPPING')
    expectOnlyAllowed(stopping, ['STOP_REEL', 'SLAM_STOP'])
  })

  it('EVALUATING accepts only REVEAL; SHOWING_WINS only WINS_DONE', () => {
    const evaluating = run(fresh(), spinOf(BASE_WIN), ...STOP_ALL)
    expectOnlyAllowed(evaluating, ['REVEAL'])
    const showing = slotReducer(evaluating, { type: 'REVEAL' })
    expectOnlyAllowed(showing, ['WINS_DONE'])
  })

  it('CLAIM_FREE_PEARLS is ignored at 10,000 (no-op returns the same object)', () => {
    const s = fresh()
    expect(slotReducer(s, { type: 'CLAIM_FREE_PEARLS' })).toBe(s)
  })

  it('SET_BET ignores out-of-range levels', () => {
    const s = fresh()
    expect(slotReducer(s, { type: 'SET_BET', level: 7 })).toBe(s)
    expect(slotReducer(s, { type: 'SET_BET', level: 2 }).betLevel).toBe(2)
  })
})

describe('wallet rules in the machine', () => {
  it('rejects a spin when the balance is below the bet', () => {
    const s = fresh(24)
    expect(canSpin(s)).toBe(false)
    expect(slotReducer(s, spinOf(BASE_WIN))).toBe(s)
    const highBet = fresh(100, 3)
    expect(slotReducer(highBet, spinOf(BASE_WIN))).toBe(highBet)
  })

  it('allows claiming free Pearls only below the minimum bet, then spinning again', () => {
    let s = fresh(10)
    s = slotReducer(s, { type: 'CLAIM_FREE_PEARLS' })
    expect(s.balance).toBe(5_010)
    expect(slotReducer(s, { type: 'CLAIM_FREE_PEARLS' })).toBe(s)
    expect(canSpin(s)).toBe(true)
  })

  it('keeps every balance an integer', () => {
    let s = fresh(10_000, 2)
    for (const r of [BASE_WIN, NO_WIN, BASE_WIN]) {
      s = playRound(s, r)
      expect(Number.isInteger(s.balance)).toBe(true)
    }
  })
})

describe('slam stop', () => {
  it('stops every reel at once on the SAME result', () => {
    const spinning = slotReducer(fresh(), spinOf(BASE_WIN))
    const slammed = slotReducer(spinning, { type: 'SLAM_STOP' })
    expect(slammed.phase).toBe('EVALUATING')
    expect(slammed.reelsStopped).toBe(5)
    expect(slammed.slammed).toBe(true)
    expect(slammed.round).toBe(spinning.round)
    expect(slammed.balance).toBe(spinning.balance)
  })

  it('works mid-stopping too and ends exactly like an unslammed spin', () => {
    const a = playRound(fresh(), BASE_WIN)
    let b = run(fresh(), spinOf(BASE_WIN), { type: 'STOP_REEL' }, { type: 'STOP_REEL' }, { type: 'SLAM_STOP' })
    b = run(b, { type: 'REVEAL' }, { type: 'WINS_DONE' })
    expect(b.balance).toBe(a.balance)
    expect(b.round?.result).toBe(a.round?.result)
    expect(b.phase).toBe('IDLE')
  })

  it('is ignored once the reels are at rest', () => {
    const evaluating = run(fresh(), spinOf(BASE_WIN), ...STOP_ALL)
    expect(slotReducer(evaluating, { type: 'SLAM_STOP' })).toBe(evaluating)
  })
})

describe('history', () => {
  it('records bet, win and feature, newest first, hidden until the round is revealed', () => {
    let s = slotReducer(fresh(), spinOf(BASE_WIN))
    expect(s.history[0]).toEqual({ id: 1, bet: 25, winPearls: 50, freeSpins: 0, capped: false })
    expect(visibleHistory(s)).toHaveLength(0)
    s = run(s, ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' })
    expect(visibleHistory(s)).toHaveLength(1)
    s = playRound(s, NO_WIN)
    expect(s.history.map((h) => h.id)).toEqual([2, 1])
  })

  it('is capped at 50 entries', () => {
    let s = fresh(1_000_000)
    for (let i = 0; i < 60; i++) s = playRound(s, NO_WIN)
    expect(s.history).toHaveLength(50)
    expect(s.history[0].id).toBe(60)
    expect(s.history[49].id).toBe(11)
  })
})

describe('free-spins feature', () => {
  const feature = FEATURE.feature!

  function toIntro(): SlotState {
    const s = run(fresh(), spinOf(FEATURE), ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' })
    expect(s.phase).toBe('FREE_SPINS_INTRO')
    return s
  }

  it('base win → intro → every free spin in order → outro → IDLE with the right total', () => {
    let s = toIntro()
    expect(displayedWin(s)).toBe(FEATURE.baseCoins)
    expectOnlyAllowed(s, ['START_FREE_SPINS', 'SKIP_FEATURE'])
    s = slotReducer(s, { type: 'START_FREE_SPINS' })
    for (let i = 0; i < feature.spins.length; i++) {
      expect(s.phase).toBe('SPINNING')
      expect(s.freeSpinIndex).toBe(i)
      s = run(s, ...STOP_ALL)
      expect(currentSpinCoins(s)).toBe(feature.spins[i].coins)
      s = slotReducer(s, { type: 'REVEAL' })
      expect(s.revealedCoins).toBe(feature.spins[i].runningTotalCoins)
      if (s.phase === 'SHOWING_WINS') s = slotReducer(s, { type: 'WINS_DONE' })
    }
    expect(s.phase).toBe('FREE_SPINS_OUTRO')
    expectOnlyAllowed(s, ['END_FEATURE'])
    s = slotReducer(s, { type: 'END_FEATURE' })
    expect(s.phase).toBe('IDLE')
    expect(s.freeSpinIndex).toBeNull()
    expect(displayedWin(s)).toBe(FEATURE.totalCoins)
    expect(s.balance).toBe(10_000 - 25 + FEATURE.totalCoins)
    expect(s.history[0]).toMatchObject({ winPearls: FEATURE.totalCoins, freeSpins: feature.spins.length })
  })

  it('a slam stop during a free spin lands the same free spin', () => {
    let s = run(toIntro(), { type: 'START_FREE_SPINS' })
    const before = s.round
    s = slotReducer(s, { type: 'SLAM_STOP' })
    expect(s.phase).toBe('EVALUATING')
    expect(s.freeSpinIndex).toBe(0)
    expect(s.round).toBe(before)
  })

  it('SKIP from the intro jumps to the outro with the full total', () => {
    let s = slotReducer(toIntro(), { type: 'SKIP_FEATURE' })
    expect(s.phase).toBe('FREE_SPINS_OUTRO')
    expect(s.freeSpinIndex).toBe(feature.spins.length - 1)
    expect(displayedWin(s)).toBe(FEATURE.totalCoins)
    expect(displayedBalance(s)).toBe(s.balance)
    s = slotReducer(s, { type: 'END_FEATURE' })
    expect(s.phase).toBe('IDLE')
    expect(s.balance).toBe(10_000 - 25 + FEATURE.totalCoins)
  })

  it('SKIP mid-feature (even while reels spin) gives the same final state as playing it out', () => {
    let s = run(toIntro(), { type: 'START_FREE_SPINS' }, ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' })
    s = slotReducer(s, { type: 'STOP_REEL' })
    s = run(s, { type: 'SKIP_FEATURE' }, { type: 'END_FEATURE' })
    expect(s.phase).toBe('IDLE')
    expect(displayedWin(s)).toBe(FEATURE.totalCoins)
  })

  it('SKIP is ignored outside a feature and in the outro', () => {
    const idle = fresh()
    expect(slotReducer(idle, { type: 'SKIP_FEATURE' })).toBe(idle)
    const base = slotReducer(fresh(), spinOf(FEATURE))
    expect(slotReducer(base, { type: 'SKIP_FEATURE' })).toBe(base)
  })

  it('capped feature: shows paid coins, never the uncapped way wins', () => {
    const capped = cappedFeatureResult()
    let s = run(fresh(), spinOf(capped), ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' }, { type: 'START_FREE_SPINS' })
    s = run(s, ...STOP_ALL, { type: 'REVEAL' }, { type: 'WINS_DONE' }, ...STOP_ALL, { type: 'REVEAL' })
    expect(s.freeSpinIndex).toBe(1)
    expect(currentSpinCoins(s)).toBe(capped.feature!.spins[1].coins)
    expect(s.revealedCoins).toBe(125_000)
    s = slotReducer(s, { type: 'WINS_DONE' })
    expect(s.phase).toBe('FREE_SPINS_OUTRO')
    s = slotReducer(s, { type: 'END_FEATURE' })
    expect(displayedWin(s)).toBe(125_000)
    expect(s.balance).toBe(10_000 - 25 + 125_000)
    expect(s.history[0]).toMatchObject({ capped: true, freeSpins: 2 })
  })
})

describe('SYNC_STORAGE (another tab saved the wallet)', () => {
  const other = { balance: 4_321, betLevel: 2, history: [{ id: 9, bet: 100, winPearls: 0, freeSpins: 0, capped: false }] }

  it('adopts balance, bet and history when IDLE', () => {
    const s = slotReducer(fresh(), { type: 'SYNC_STORAGE', data: other })
    expect(s).toMatchObject({ phase: 'IDLE', balance: 4_321, betLevel: 2, history: other.history })
    expect(displayedBalance(s)).toBe(4_321)
  })

  it('after a finished round too: the round stays on screen, nothing is hidden', () => {
    const s = slotReducer(playRound(fresh(), BASE_WIN), { type: 'SYNC_STORAGE', data: other })
    expect(s.balance).toBe(4_321)
    expect(displayedBalance(s)).toBe(4_321)
    // The next spin continues the other tab's history ids.
    const next = slotReducer(s, spinOf(NO_WIN))
    expect(next.history[0].id).toBe(10)
  })

  it('is ignored mid-round (the hook re-applies it once IDLE)', () => {
    const spinning = slotReducer(fresh(), spinOf(BASE_WIN))
    expect(slotReducer(spinning, { type: 'SYNC_STORAGE', data: other })).toBe(spinning)
  })

  it('same wallet → same state object (no save ping-pong between tabs)', () => {
    const s = fresh()
    expect(slotReducer(s, { type: 'SYNC_STORAGE', data: { balance: s.balance, betLevel: s.betLevel, history: [] } })).toBe(s)
  })
})
