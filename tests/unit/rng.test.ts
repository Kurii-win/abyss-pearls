import { describe, expect, it } from 'vitest'
import { createCryptoRng, createRngFromSource, createSeededRng } from '../../src/models/rng'

describe('createSeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededRng(42)
    const b = createSeededRng(42)
    for (let i = 0; i < 1000; i++) expect(a.nextUint32()).toBe(b.nextUint32())
  })

  it('produces different sequences for different seeds', () => {
    const a = createSeededRng(1)
    const b = createSeededRng(2)
    const seqA = Array.from({ length: 8 }, () => a.nextUint32())
    const seqB = Array.from({ length: 8 }, () => b.nextUint32())
    expect(seqA).not.toEqual(seqB)
  })

  it('returns unsigned 32-bit integers', () => {
    const rng = createSeededRng(7)
    for (let i = 0; i < 10_000; i++) {
      const x = rng.nextUint32()
      expect(Number.isInteger(x)).toBe(true)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(2 ** 32)
    }
  })

  it('nextInt stays in range for many sizes', () => {
    const rng = createSeededRng(99)
    for (const n of [1, 2, 3, 7, 40, 54, 57, 1000, 2 ** 31 + 1, 2 ** 32]) {
      for (let i = 0; i < 2000; i++) {
        const x = rng.nextInt(n)
        expect(Number.isInteger(x)).toBe(true)
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThan(n)
      }
    }
  })

  it('nextInt(1) is always 0', () => {
    const rng = createSeededRng(5)
    for (let i = 0; i < 100; i++) expect(rng.nextInt(1)).toBe(0)
  })

  it('nextInt(40) is uniform (chi-square, 400k draws, p > 0.001)', () => {
    const rng = createSeededRng(20261109)
    const bins = 40
    const draws = 400_000
    const counts = new Array<number>(bins).fill(0)
    for (let i = 0; i < draws; i++) counts[rng.nextInt(bins)]++
    const expected = draws / bins
    const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0)
    // Critical value of chi-square with 39 degrees of freedom at p = 0.001.
    expect(chi2).toBeLessThan(72.05)
  })
})

describe('nextInt argument checks', () => {
  const rng = createSeededRng(1)
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 32 + 1])('throws for %s', (n) => {
    expect(() => rng.nextInt(n)).toThrow(RangeError)
  })
})

describe('rejection sampling', () => {
  it('rejects draws from the biased top range and redraws', () => {
    // 2^32 = 40 × 107374182 + 16, so the top 16 values [4294967280, 2^32) are biased.
    const script = [0xffffffff, 4294967280, 41]
    let calls = 0
    const rng = createRngFromSource(() => script[calls++])
    expect(rng.nextInt(40)).toBe(1) // 41 % 40
    expect(calls).toBe(3)
  })

  it('accepts the last unbiased value', () => {
    let calls = 0
    const rng = createRngFromSource(() => {
      calls++
      return 4294967279 // limit - 1 for n = 40
    })
    expect(rng.nextInt(40)).toBe(4294967279 % 40)
    expect(calls).toBe(1)
  })
})

describe('createCryptoRng', () => {
  it('draws in range from crypto.getRandomValues', () => {
    const rng = createCryptoRng(16)
    for (let i = 0; i < 1000; i++) {
      const x = rng.nextInt(54)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(54)
    }
  })
})
