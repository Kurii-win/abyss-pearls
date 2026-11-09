import { describe, expect, it } from 'vitest'
import { loadMuted, saveMuted, SOUND_STORAGE_KEY } from '../../src/controllers/soundSettings'

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

describe('soundSettings', () => {
  it('sound is on by default', () => {
    expect(loadMuted(memoryStorage())).toBe(false)
    expect(loadMuted(undefined)).toBe(false)
  })

  it('round-trips the muted flag', () => {
    const storage = memoryStorage()
    saveMuted(true, storage)
    expect(storage.getItem(SOUND_STORAGE_KEY)).toBe('{"muted":true}')
    expect(loadMuted(storage)).toBe(true)
    saveMuted(false, storage)
    expect(loadMuted(storage)).toBe(false)
  })

  it('ignores junk and survives blocked storage', () => {
    const storage = memoryStorage()
    for (const junk of ['not json', '"muted"', '{"muted":"yes"}', 'null', '[]']) {
      storage.setItem(SOUND_STORAGE_KEY, junk)
      expect(loadMuted(storage)).toBe(false)
    }
    expect(loadMuted(throwingStorage)).toBe(false)
    expect(() => saveMuted(true, throwingStorage)).not.toThrow()
  })
})
