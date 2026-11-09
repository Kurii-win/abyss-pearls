import { describe, expect, it } from 'vitest'
import {
  BET_LEVELS,
  canAfford,
  canClaimFreePearls,
  claimFreePearls,
  creditWin,
  debitBet,
  FREE_PEARLS_GRANT,
  isBetLevel,
  isPearlAmount,
  MIN_BET,
  settleSpin,
  STARTING_BALANCE,
  winToPearls,
} from '../../src/models/wallet'

describe('wallet constants', () => {
  it('offers bets of 25/50/100/250 at coin values 1/2/4/10', () => {
    expect(BET_LEVELS).toEqual([
      { coinValue: 1, bet: 25 },
      { coinValue: 2, bet: 50 },
      { coinValue: 4, bet: 100 },
      { coinValue: 10, bet: 250 },
    ])
    expect(MIN_BET).toBe(25)
    expect(STARTING_BALANCE).toBe(10_000)
    expect(FREE_PEARLS_GRANT).toBe(5_000)
  })

  it('validates bet level indices', () => {
    expect([0, 1, 2, 3].every(isBetLevel)).toBe(true)
    for (const bad of [-1, 4, 1.5, '1', null]) expect(isBetLevel(bad)).toBe(false)
  })
})

describe('isPearlAmount', () => {
  it('accepts only non-negative safe integers', () => {
    expect(isPearlAmount(0)).toBe(true)
    expect(isPearlAmount(10_000)).toBe(true)
    for (const bad of [-1, 1.5, NaN, Infinity, 2 ** 53, '5', null, undefined]) expect(isPearlAmount(bad)).toBe(false)
  })
})

describe('debit and credit', () => {
  it('debits the bet', () => {
    expect(debitBet(10_000, 25)).toBe(9_975)
    expect(debitBet(25, 25)).toBe(0)
  })

  it('rejects a bet larger than the balance', () => {
    expect(() => debitBet(24, 25)).toThrow(RangeError)
    expect(canAfford(24, 25)).toBe(false)
    expect(canAfford(25, 25)).toBe(true)
  })

  it('rejects zero, negative or fractional amounts', () => {
    expect(() => debitBet(100, 0)).toThrow()
    expect(() => debitBet(100, -25)).toThrow()
    expect(() => debitBet(100, 2.5)).toThrow()
    expect(() => debitBet(100.5, 25)).toThrow()
    expect(() => creditWin(100, -1)).toThrow()
    expect(() => creditWin(100, 0.1)).toThrow()
    expect(canAfford(100, 0)).toBe(false)
  })

  it('converts coins to Pearls at the coin value', () => {
    expect(winToPearls(50, 1)).toBe(50)
    expect(winToPearls(50, 10)).toBe(500)
    expect(() => winToPearls(1.5, 2)).toThrow()
  })

  it('settles a spin: balance − bet + win, integers only', () => {
    expect(settleSpin(10_000, 250, 500)).toBe(10_250)
    expect(settleSpin(10_000, 25, 0)).toBe(9_975)
    expect(Number.isInteger(settleSpin(9_999, 100, 37))).toBe(true)
    expect(() => settleSpin(10, 25, 1_000)).toThrow()
  })
})

describe('free Pearls', () => {
  it('is available only below the minimum bet', () => {
    expect(canClaimFreePearls(24)).toBe(true)
    expect(canClaimFreePearls(0)).toBe(true)
    expect(canClaimFreePearls(25)).toBe(false)
    expect(canClaimFreePearls(STARTING_BALANCE)).toBe(false)
  })

  it('adds 5,000 when eligible and throws otherwise', () => {
    expect(claimFreePearls(10)).toBe(5_010)
    expect(() => claimFreePearls(25)).toThrow(RangeError)
  })
})
