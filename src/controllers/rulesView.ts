/**
 * The Rules / Paytable view model. Every value comes from the models (paytable, reel
 * strips, free-spin rules, bet levels, cap) or, for the RTP, from the simulation report
 * via rtpReportView. Nothing here is typed by hand except wording.
 */
import { BASE_PAYTABLE, COINS_PER_BET, MAX_FREE_SPINS, REELS, RETRIGGER_SPINS, ROWS, WILD_MULTIPLIER_WEIGHTS, WIN_CAP_COINS, waySymbols, waysPay } from '../models/paytable'
import { BASE_STRIPS, FREE_SPIN_STRIPS } from '../models/reelStrips'
import type { ReelStrips, SymbolId, WaySymbol } from '../models/types'
import { BET_LEVELS } from '../models/wallet'
import { SYMBOL_NAMES, type SymbolFace } from './reelPresentation'
import { formatNumber, RTP_REPORT_VIEW } from './rtpReportView'

export const MALFUNCTION_NOTICE = 'Malfunction voids all pays and plays.'
export const DEMO_NOTICE = 'Demo only: ✦ Pearls have no monetary value and cannot be purchased or redeemed.'

export interface PayCell {
  /** Reels in the run (2..REELS). */
  readonly length: number
  /** Pearls per way at the selected bet; 0 = does not pay. */
  readonly pearls: number
  readonly text: string
}

export interface SymbolPayRow {
  readonly id: WaySymbol
  /** Art to show (the Whale uses its single-cell face). */
  readonly face: SymbolFace
  readonly name: string
  readonly pays: readonly PayCell[]
}

export interface ScatterPayRow {
  readonly count: number
  readonly betMultiplier: number
  readonly pearls: number
  readonly freeSpins: number
  readonly text: string
}

export interface RulesView {
  readonly bet: number
  readonly betText: string
  readonly coinValue: number
  /** Column headers for the pays table: run lengths 2..REELS. */
  readonly lengths: readonly number[]
  readonly symbols: readonly SymbolPayRow[]
  readonly wild: { readonly face: SymbolFace; readonly name: string; readonly text: string }
  readonly scatter: {
    readonly face: SymbolFace
    readonly name: string
    readonly rows: readonly ScatterPayRow[]
    readonly text: string
  }
  readonly ways: { readonly count: number; readonly text: readonly string[] }
  readonly freeSpins: readonly string[]
  readonly winCap: string
  readonly betRange: string
  readonly rtp: string
  readonly notices: readonly string[]
}

const pearls = (n: number) => `✦ ${formatNumber(n)}`

/** 1-based reels whose strips contain `symbol`. */
export function reelsWith(strips: ReelStrips, symbol: SymbolId): number[] {
  return strips.flatMap((strip, i) => (strip.includes(symbol) ? [i + 1] : []))
}

/** [2, 3, 4] → "reels 2–4"; [1, 3] → "reels 1, 3"; [2] → "reel 2". */
export function describeReels(reels: readonly number[]): string {
  if (reels.length === 0) return 'no reels'
  if (reels.length === 1) return `reel ${reels[0]}`
  const contiguous = reels.every((r, i) => i === 0 || r === reels[i - 1] + 1)
  return contiguous ? `reels ${reels[0]}–${reels[reels.length - 1]}` : `reels ${reels.join(', ')}`
}

/** "×2 or ×3" style list. */
function orList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
}

export function buildRulesView(betLevel: number): RulesView {
  const level = BET_LEVELS[betLevel] ?? BET_LEVELS[0]
  const { bet, coinValue } = level
  const lengths = Array.from({ length: REELS - 1 }, (_, i) => i + 2)

  const symbols: SymbolPayRow[] = waySymbols(BASE_PAYTABLE).map((id) => ({
    id,
    face: id === 'WHALE' ? 'WHALE_SINGLE' : id,
    name: SYMBOL_NAMES[id],
    pays: lengths.map((length) => {
      const p = waysPay(BASE_PAYTABLE, id, length) * coinValue
      return { length, pearls: p, text: p > 0 ? pearls(p) : '—' }
    }),
  }))

  const sc = BASE_PAYTABLE.scatter
  const scatterRows: ScatterPayRow[] = []
  for (let count = 0; count < sc.betMultipliers.length; count++) {
    const m = sc.betMultipliers[count]
    const spins = sc.freeSpins[count] ?? 0
    if (m <= 0 && spins <= 0) continue
    scatterRows.push({
      count,
      betMultiplier: m,
      pearls: m * bet,
      freeSpins: spins,
      text: `${formatNumber(m)}× total bet (${pearls(m * bet)})${spins > 0 ? ` + ${formatNumber(spins)} free spins` : ''}`,
    })
  }
  const minTriggerChests = scatterRows.find((r) => r.freeSpins > 0)?.count ?? 0

  const wildReels = reelsWith(BASE_STRIPS, 'WILD')
  const freeWildReels = reelsWith(FREE_SPIN_STRIPS, 'WILD')
  const multipliers = WILD_MULTIPLIER_WEIGHTS.map((w) => w.multiplier)
  // A way passes through one cell per reel, so at most one wild per wild reel.
  const maxWayMultiplier = freeWildReels.length * Math.max(...multipliers)
  const ways = ROWS ** REELS
  const capX = WIN_CAP_COINS / COINS_PER_BET
  const minBet = BET_LEVELS[0].bet
  const maxBet = BET_LEVELS[BET_LEVELS.length - 1].bet

  return {
    bet,
    betText: pearls(bet),
    coinValue,
    lengths,
    symbols,
    wild: {
      face: 'WILD',
      name: SYMBOL_NAMES.WILD,
      text:
        `Appears on ${describeReels(wildReels)} only and substitutes for every symbol except the ` +
        `${SYMBOL_NAMES.CHEST} scatter.`,
    },
    scatter: {
      face: 'CHEST',
      name: SYMBOL_NAMES.CHEST,
      rows: scatterRows,
      text: `Pays anywhere on the reels, multiplied by the total bet. ${formatNumber(minTriggerChests)} or more trigger free spins.`,
    },
    ways: {
      count: ways,
      text: [
        `${formatNumber(REELS)} reels × ${formatNumber(ROWS)} rows: ${formatNumber(ways)} ways to win on every spin.`,
        'Wins pay left to right on adjacent reels, starting from reel 1, in any row.',
        'For each symbol only its longest run pays.',
        'Ways for a run = the product of matching symbols (or wilds) on each reel in the run.',
        'Pays shown are ✦ per way at the selected bet; ways pays and scatter pays add up.',
      ],
    },
    freeSpins: [
      `${scatterRows
        .filter((r) => r.freeSpins > 0)
        .map((r) => `${formatNumber(r.count)} chests: ${formatNumber(r.freeSpins)} free spins`)
        .join(' · ')}.`,
      `In free spins every wild (${describeReels(freeWildReels)}) lands with a ${orList(multipliers.map((m) => `×${m}`))} multiplier.`,
      `Wild multipliers on the same way add together (up to ×${formatNumber(maxWayMultiplier)}); a way with no wild pays ×1.`,
      `${formatNumber(minTriggerChests)} or more chests during free spins pay and add ${formatNumber(RETRIGGER_SPINS)} spins.`,
      `At most ${formatNumber(MAX_FREE_SPINS)} free spins per feature; extra retriggered spins are not awarded.`,
    ],
    winCap: `Win cap: ${formatNumber(capX)}× total bet (${pearls(capX * bet)} at this bet) per spin, including its free spins. The feature ends when the cap is reached.`,
    betRange: `Bet range ${pearls(minBet)} – ${pearls(maxBet)} (${BET_LEVELS.map((l) => formatNumber(l.bet)).join(' / ')}). Selected bet ${pearls(bet)}.`,
    rtp: `${RTP_REPORT_VIEW.headline.text}. RTP is a long-run average over millions of spins, not a prediction for a session.`,
    notices: [MALFUNCTION_NOTICE, DEMO_NOTICE],
  }
}
