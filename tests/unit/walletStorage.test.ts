import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SLOT_DATA,
  isNewerRev,
  loadSlotData,
  nextRev,
  parseSlotDataText,
  parseStoredSlotData,
  saveSlotData,
  STORAGE_KEY,
} from '../../src/controllers/walletStorage'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k) },
    setItem: (k, v) => { map.set(k, String(v)) },
  }
}

const throwingStorage = {
  getItem: () => { throw new Error('blocked') },
  setItem: () => { throw new Error('quota') },
} as unknown as Storage

describe('walletStorage', () => {
  it('starts at 10,000 with nothing stored', () => {
    expect(loadSlotData(memoryStorage())).toEqual(DEFAULT_SLOT_DATA)
    expect(DEFAULT_SLOT_DATA.balance).toBe(10_000)
  })

  it('round-trips balance, bet level and history', () => {
    const storage = memoryStorage()
    const data = { balance: 1234, betLevel: 2, history: [{ id: 3, bet: 100, winPearls: 40, freeSpins: 0, capped: false }], rev: 7 }
    expect(saveSlotData(data, storage)).toBe(true)
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(loadSlotData(storage)).toEqual(data)
  })

  it('works when storage throws or is missing', () => {
    expect(loadSlotData(throwingStorage)).toEqual(DEFAULT_SLOT_DATA)
    expect(() => saveSlotData(DEFAULT_SLOT_DATA, throwingStorage)).not.toThrow()
    expect(saveSlotData(DEFAULT_SLOT_DATA, throwingStorage)).toBe(false)
    expect(saveSlotData(DEFAULT_SLOT_DATA, undefined)).toBe(false)
    expect(loadSlotData(undefined)).toEqual(DEFAULT_SLOT_DATA)
  })

  it('ignores corrupt JSON and invalid fields', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, '{not json')
    expect(loadSlotData(storage)).toEqual(DEFAULT_SLOT_DATA)
    expect(parseStoredSlotData({ balance: -5, betLevel: 9, history: 'x' })).toEqual(DEFAULT_SLOT_DATA)
    expect(parseStoredSlotData({ balance: 10.5 }).balance).toBe(10_000)
    expect(parseStoredSlotData(null)).toEqual(DEFAULT_SLOT_DATA)
    const parsed = parseStoredSlotData({ balance: 7, betLevel: 1, history: [{ id: 1 }, { id: 2, bet: 25, winPearls: 0, freeSpins: 0, capped: false }] })
    expect(parsed).toEqual({ balance: 7, betLevel: 1, history: [{ id: 2, bet: 25, winPearls: 0, freeSpins: 0, capped: false }], rev: 0 })
  })

  it('keeps at most 50 history entries', () => {
    const history = Array.from({ length: 80 }, (_, i) => ({ id: i + 1, bet: 25, winPearls: 0, freeSpins: 0, capped: false }))
    expect(parseStoredSlotData({ balance: 1, betLevel: 0, history }).history).toHaveLength(50)
  })
})

describe('parseSlotDataText (storage event from another tab)', () => {
  it('parses and validates the saved wallet', () => {
    const data = { balance: 50, betLevel: 1, history: [], rev: 3 }
    expect(parseSlotDataText(JSON.stringify(data))).toEqual(data)
    expect(parseSlotDataText('{"balance":-3,"betLevel":9}')).toEqual(DEFAULT_SLOT_DATA)
  })

  it('null for a removed key or broken JSON', () => {
    expect(parseSlotDataText(null)).toBeNull()
    expect(parseSlotDataText('{oops')).toBeNull()
  })
})

describe('wallet revisions (multi-tab integrity)', () => {
  it('data saved before revisions existed counts as revision 0', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, JSON.stringify({ balance: 900, betLevel: 1, history: [] }))
    expect(loadSlotData(storage)).toEqual({ balance: 900, betLevel: 1, history: [], rev: 0 })
  })

  it('invalid revisions fall back to 0 without losing the wallet', () => {
    for (const rev of [-1, 1.5, '4', null, Number.MAX_SAFE_INTEGER + 2]) {
      const parsed = parseStoredSlotData({ balance: 900, betLevel: 1, history: [], rev })
      expect(parsed.rev).toBe(0)
      expect(parsed.balance).toBe(900)
    }
  })

  it('nextRev is newer than both this tab and storage', () => {
    expect(nextRev(0, 0)).toBe(1)
    expect(nextRev(5, 2)).toBe(6)
    expect(nextRev(2, 5)).toBe(6)
    for (const [a, b] of [[0, 9], [9, 0], [4, 4]]) {
      const n = nextRev(a, b)
      expect(isNewerRev(n, a) && isNewerRev(n, b)).toBe(true)
    }
  })

  it('only strictly newer revisions are adopted (stale and echoed saves are dropped)', () => {
    expect(isNewerRev(3, 2)).toBe(true)
    expect(isNewerRev(2, 2)).toBe(false)
    expect(isNewerRev(1, 2)).toBe(false)
  })

  it('round-trips the revision', () => {
    const storage = memoryStorage()
    saveSlotData({ ...DEFAULT_SLOT_DATA, rev: 42 }, storage)
    expect(loadSlotData(storage).rev).toBe(42)
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).rev).toBe(42)
  })
})
