/**
 * localStorage persistence for the wallet balance, bet level and session history.
 * Everything is wrapped in try/catch: the game must work with storage blocked
 * (private mode, disabled cookies, quota errors). Stored data is never trusted:
 * anything malformed falls back to the defaults.
 *
 * Several tabs share one wallet. Every save carries a monotonic revision `rev`
 * (max(rev this tab knows, rev in storage) + 1), so a tab can tell whether the stored
 * wallet is newer than the one it settled on and never adopts stale data. Data saved
 * before revisions existed has no `rev` and counts as revision 0.
 */
import { isBetLevel, isPearlAmount, STARTING_BALANCE } from '../models/wallet'
import { HISTORY_LIMIT, type HistoryEntry, type InitialSlotData } from './slotReducer'

export const STORAGE_KEY = 'abyss-pearls:wallet:v1'

/** The wallet as stored: the slot data plus its revision. */
export interface StoredSlotData extends InitialSlotData {
  readonly rev: number
}

export const DEFAULT_SLOT_DATA: StoredSlotData = { balance: STARTING_BALANCE, betLevel: 0, history: [], rev: 0 }

function isRev(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
}

/** Revision for the next save: newer than anything this tab or storage has seen. */
export function nextRev(localRev: number, storedRev: number): number {
  return Math.max(localRev, storedRev) + 1
}

/** Adopt stored data only if it is strictly newer than the revision this tab last saw or wrote. */
export function isNewerRev(incomingRev: number, seenRev: number): boolean {
  return incomingRev > seenRev
}

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
export function parseStoredSlotData(raw: unknown): StoredSlotData {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SLOT_DATA
  const r = raw as Record<string, unknown>
  return {
    balance: isPearlAmount(r.balance) ? r.balance : DEFAULT_SLOT_DATA.balance,
    betLevel: isBetLevel(r.betLevel) ? r.betLevel : DEFAULT_SLOT_DATA.betLevel,
    history: Array.isArray(r.history) ? r.history.filter(isHistoryEntry).slice(0, HISTORY_LIMIT) : [],
    rev: isRev(r.rev) ? r.rev : 0,
  }
}

/**
 * Parse the wallet text another tab wrote (a `storage` event's newValue). Null when the
 * key was removed or the text is not JSON; otherwise validated like loadSlotData.
 */
export function parseSlotDataText(text: string | null): StoredSlotData | null {
  if (text === null) return null
  try {
    return parseStoredSlotData(JSON.parse(text))
  } catch {
    return null
  }
}

export function loadSlotData(storage: Storage | undefined = safeLocalStorage()): StoredSlotData {
  try {
    const text = storage?.getItem(STORAGE_KEY)
    return text ? parseStoredSlotData(JSON.parse(text)) : DEFAULT_SLOT_DATA
  } catch {
    return DEFAULT_SLOT_DATA
  }
}

/**
 * Save the wallet with an explicit revision (see nextRev). Returns false if storage is
 * unavailable or full: the session simply isn't persisted.
 */
export function saveSlotData(data: StoredSlotData, storage: Storage | undefined = safeLocalStorage()): boolean {
  try {
    if (!storage) return false
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ balance: data.balance, betLevel: data.betLevel, history: data.history, rev: data.rev }),
    )
    return true
  } catch {
    return false
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
