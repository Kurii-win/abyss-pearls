import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SLOT_DATA,
  loadSlotData,
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
    const data = { balance: 1234, betLevel: 2, history: [{ id: 3, bet: 100, winPearls: 40, freeSpins: 0, capped: false }] }
    saveSlotData(data, storage)
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(loadSlotData(storage)).toEqual(data)
  })

  it('works when storage throws or is missing', () => {
    expect(loadSlotData(throwingStorage)).toEqual(DEFAULT_SLOT_DATA)
    expect(() => saveSlotData(DEFAULT_SLOT_DATA, throwingStorage)).not.toThrow()
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
    expect(parsed).toEqual({ balance: 7, betLevel: 1, history: [{ id: 2, bet: 25, winPearls: 0, freeSpins: 0, capped: false }] })
  })

  it('keeps at most 50 history entries', () => {
    const history = Array.from({ length: 80 }, (_, i) => ({ id: i + 1, bet: 25, winPearls: 0, freeSpins: 0, capped: false }))
    expect(parseStoredSlotData({ balance: 1, betLevel: 0, history }).history).toHaveLength(50)
  })
})
