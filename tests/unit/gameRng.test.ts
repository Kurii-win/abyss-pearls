import { describe, expect, it } from 'vitest'
import { parseSeedParam } from '../../src/controllers/gameRng'

describe('parseSeedParam (dev-only ?seed=)', () => {
  it('reads a uint32 seed', () => {
    expect(parseSeedParam('?seed=219')).toBe(219)
    expect(parseSeedParam('?a=1&seed=0')).toBe(0)
    expect(parseSeedParam('?seed=4294967295')).toBe(4294967295)
  })

  it('rejects missing or malformed seeds', () => {
    for (const q of ['', '?seed=', '?seed=-1', '?seed=1.5', '?seed=abc', '?seed=4294967296', '?seed=1e3']) {
      expect(parseSeedParam(q)).toBeNull()
    }
  })
})
