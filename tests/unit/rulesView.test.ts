import { describe, expect, it } from 'vitest'
import { buildRulesView, DEMO_NOTICE, describeReels, MALFUNCTION_NOTICE, reelsWith } from '../../src/controllers/rulesView'
import { RTP_REPORT_VIEW } from '../../src/controllers/rtpReportView'
import { BASE_PAYTABLE, MAX_FREE_SPINS, RETRIGGER_SPINS, WIN_CAP_COINS, COINS_PER_BET, waySymbols } from '../../src/models/paytable'
import { BASE_STRIPS } from '../../src/models/reelStrips'
import { BET_LEVELS } from '../../src/models/wallet'

describe('rulesView', () => {
  it('lists every ways symbol in paytable order with ✦ per way at the selected bet', () => {
    for (let level = 0; level < BET_LEVELS.length; level++) {
      const v = buildRulesView(level)
      const { coinValue, bet } = BET_LEVELS[level]
      expect(v.bet).toBe(bet)
      expect(v.symbols.map((s) => s.id)).toEqual(waySymbols(BASE_PAYTABLE))
      for (const row of v.symbols) {
        for (const cell of row.pays) {
          expect(cell.pearls).toBe(BASE_PAYTABLE.ways[row.id][cell.length] * coinValue)
          expect(cell.text).toBe(cell.pearls > 0 ? `✦ ${cell.pearls.toLocaleString('en-US')}` : '—')
        }
      }
    }
  })

  it('shows the whale with its single-cell art', () => {
    const whale = buildRulesView(0).symbols.find((s) => s.id === 'WHALE')
    expect(whale?.face).toBe('WHALE_SINGLE')
  })

  it('scatter rows: pays × total bet and free spins from the paytable', () => {
    const level = 2
    const v = buildRulesView(level)
    const bet = BET_LEVELS[level].bet
    const sc = BASE_PAYTABLE.scatter
    const expected = sc.betMultipliers.flatMap((m, count) => (m > 0 ? [{ count, m, spins: sc.freeSpins[count] }] : []))
    expect(v.scatter.rows.map((r) => [r.count, r.betMultiplier, r.pearls, r.freeSpins])).toEqual(
      expected.map((e) => [e.count, e.m, e.m * bet, e.spins]),
    )
  })

  it('wild reels are read from the strips', () => {
    expect(reelsWith(BASE_STRIPS, 'WILD')).toEqual([2, 3, 4])
    expect(buildRulesView(0).wild.text).toContain('reels 2–4')
    expect(describeReels([2])).toBe('reel 2')
    expect(describeReels([1, 3])).toBe('reels 1, 3')
  })

  it('feature, cap, bet range and RTP come from models and the report', () => {
    const v = buildRulesView(3)
    const capX = WIN_CAP_COINS / COINS_PER_BET
    const free = v.freeSpins.join(' ')
    expect(free).toContain('×2 or ×3')
    expect(free).toContain('up to ×9')
    expect(free).toContain(`add ${RETRIGGER_SPINS} spins`)
    expect(free).toContain(`At most ${MAX_FREE_SPINS} free spins`)
    expect(v.winCap).toContain(`${capX.toLocaleString('en-US')}× total bet`)
    expect(v.winCap).toContain(`✦ ${(capX * BET_LEVELS[3].bet).toLocaleString('en-US')}`)
    expect(v.betRange).toContain(`✦ ${BET_LEVELS[0].bet} – ✦ ${BET_LEVELS[BET_LEVELS.length - 1].bet}`)
    expect(v.rtp).toContain(RTP_REPORT_VIEW.headline.text)
    expect(v.ways.count).toBe(243)
  })

  it('carries the malfunction and demo notices', () => {
    expect(buildRulesView(0).notices).toEqual([MALFUNCTION_NOTICE, DEMO_NOTICE])
    expect(DEMO_NOTICE).toBe('Demo only: ✦ Pearls have no monetary value and cannot be purchased or redeemed.')
  })

  it('falls back to the lowest bet for an invalid level', () => {
    expect(buildRulesView(99).bet).toBe(BET_LEVELS[0].bet)
  })
})
