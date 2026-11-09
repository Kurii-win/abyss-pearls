/**
 * The ✦ Pearls wallet (virtual currency only; CLAUDE.md Hard rules 1 and 2).
 *
 * Pure functions over integer Pearl amounts. No persistence here: the controller
 * decides where the balance is stored. Pearls can only enter the wallet as spin wins
 * or the free "Get Free Pearls" grant; nothing can leave it except a bet.
 */
import { COINS_PER_BET } from './paytable'

/** One bet size the player can choose. Total bet = COINS_PER_BET × coinValue Pearls. */
export interface BetLevel {
  /** Pearls per coin. */
  readonly coinValue: number
  /** Total bet in Pearls. */
  readonly bet: number
}

/** Coin values on offer (docs/MATH.md §1): bets of 25 / 50 / 100 / 250 ✦. */
export const COIN_VALUES = [1, 2, 4, 10] as const

export const BET_LEVELS: readonly BetLevel[] = COIN_VALUES.map((coinValue) => ({
  coinValue,
  bet: coinValue * COINS_PER_BET,
}))

/** Smallest bet; below this the player may claim free Pearls. */
export const MIN_BET = BET_LEVELS[0].bet

export const STARTING_BALANCE = 10_000

/** Pearls added by one "Get Free Pearls" claim. */
export const FREE_PEARLS_GRANT = 5_000

/** A valid Pearl amount: a non-negative safe integer. */
export function isPearlAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function assertPearls(value: number, what: string): void {
  if (!isPearlAmount(value)) throw new RangeError(`${what} must be a non-negative integer, got ${value}`)
}

/** True if `level` is an index into BET_LEVELS. */
export function isBetLevel(level: unknown): level is number {
  return typeof level === 'number' && Number.isInteger(level) && level >= 0 && level < BET_LEVELS.length
}

export function canAfford(balance: number, bet: number): boolean {
  return isPearlAmount(balance) && isPearlAmount(bet) && bet > 0 && balance >= bet
}

/** Take the bet from the balance. Throws if it cannot be afforded. */
export function debitBet(balance: number, bet: number): number {
  assertPearls(balance, 'balance')
  assertPearls(bet, 'bet')
  if (bet === 0) throw new RangeError('bet must be positive')
  if (balance < bet) throw new RangeError(`insufficient balance: ${balance} < ${bet}`)
  return balance - bet
}

/** Convert a win in coins to Pearls at the coin value the spin was played with. */
export function winToPearls(coins: number, coinValue: number): number {
  assertPearls(coins, 'coins')
  assertPearls(coinValue, 'coinValue')
  return coins * coinValue
}

/** Add a win (in Pearls) to the balance. */
export function creditWin(balance: number, winPearls: number): number {
  assertPearls(balance, 'balance')
  assertPearls(winPearls, 'win')
  return balance + winPearls
}

/** Debit the bet and credit the (already decided) win of one paid spin. */
export function settleSpin(balance: number, bet: number, winPearls: number): number {
  return creditWin(debitBet(balance, bet), winPearls)
}

/** Free Pearls are only offered when the player cannot afford the smallest bet. */
export function canClaimFreePearls(balance: number): boolean {
  return isPearlAmount(balance) && balance < MIN_BET
}

/** Add the free grant. Throws if the player is not eligible. */
export function claimFreePearls(balance: number): number {
  if (!canClaimFreePearls(balance)) throw new RangeError(`not eligible for free Pearls at balance ${balance}`)
  return balance + FREE_PEARLS_GRANT
}
