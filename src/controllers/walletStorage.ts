/**
 * localStorage persistence for the wallet balance, bet level and session history.
 * Everything is wrapped in try/catch: the game must work with storage blocked
 * (private mode, disabled cookies, quota errors). Stored data is never trusted:
 * anything malformed falls back to the defaults.
 */
import { isBetLevel, isPearlAmount, STARTING_BALANCE } from '../models/wallet'
import { HISTORY_LIMIT, type HistoryEntry, type InitialSlotData } from './slotReducer'

export const STORAGE_KEY = 'abyss-pearls:wallet:v1'

export const DEFAULT_SLOT_DATA: InitialSlotData = { balance: STARTING_BALANCE, betLevel: 0, history: [] }

function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  return (
    isPearlAmount(e.id) &&
    isPearlAmount(e.bet) &&
    isPearlAmount(e.winPearls) &&
    isPearlAmount(e.freeSpins) &&
    typeof e.capped === 'boolean'
  )
}

/** Validate parsed storage contents; anything invalid falls back field by field. */
export function parseStoredSlotData(raw: unknown): InitialSlotData {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SLOT_DATA
  const r = raw as Record<string, unknown>
  return {
    balance: isPearlAmount(r.balance) ? r.balance : DEFAULT_SLOT_DATA.balance,
    betLevel: isBetLevel(r.betLevel) ? r.betLevel : DEFAULT_SLOT_DATA.betLevel,
    history: Array.isArray(r.history) ? r.history.filter(isHistoryEntry).slice(0, HISTORY_LIMIT) : [],
  }
}

export function loadSlotData(storage: Storage | undefined = safeLocalStorage()): InitialSlotData {
  try {
    const text = storage?.getItem(STORAGE_KEY)
    return text ? parseStoredSlotData(JSON.parse(text)) : DEFAULT_SLOT_DATA
  } catch {
    return DEFAULT_SLOT_DATA
  }
}

export function saveSlotData(data: InitialSlotData, storage: Storage | undefined = safeLocalStorage()): void {
  try {
    storage?.setItem(
      STORAGE_KEY,
      JSON.stringify({ balance: data.balance, betLevel: data.betLevel, history: data.history }),
    )
  } catch {
    // Storage unavailable or full: the session simply isn't persisted.
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
