/**
 * The only source of randomness in the game.
 *
 * - Gameplay: createCryptoRng() (crypto.getRandomValues).
 * - Tests and simulation: createSeededRng(seed) (xoshiro128**, seeded via splitmix32).
 *
 * Integers in a range are drawn by rejection sampling, so there is no modulo bias.
 * Nothing else in the project may call Math.random() (enforced by ESLint).
 */

export interface Rng {
  /** Uniform integer in [0, 2^32). */
  nextUint32(): number
  /** Uniform integer in [0, maxExclusive). 1 <= maxExclusive <= 2^32. */
  nextInt(maxExclusive: number): number
}

const TWO_POW_32 = 0x1_0000_0000

/**
 * Build an Rng from any uniform 32-bit source. Exported so tests can inject a
 * scripted source and see rejection sampling at work.
 */
export function createRngFromSource(nextUint32: () => number): Rng {
  return {
    nextUint32,
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > TWO_POW_32) {
        throw new RangeError(`nextInt: maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`)
      }
      if (maxExclusive === TWO_POW_32) return nextUint32()
      // Largest multiple of maxExclusive that fits in 2^32. Values at or above it
      // would make the low results more likely, so they are thrown away and redrawn.
      const limit = TWO_POW_32 - (TWO_POW_32 % maxExclusive)
      for (;;) {
        const x = nextUint32()
        if (x < limit) return x % maxExclusive
      }
    },
  }
}

/** Cryptographically secure RNG for real gameplay. Works in browsers and Node. */
export function createCryptoRng(bufferSize = 256): Rng {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('createCryptoRng: crypto.getRandomValues is not available')
  }
  const buffer = new Uint32Array(bufferSize)
  let index = bufferSize
  return createRngFromSource(() => {
    if (index >= bufferSize) {
      cryptoApi.getRandomValues(buffer)
      index = 0
    }
    return buffer[index++]
  })
}

/** splitmix32 step: turns one 32-bit seed into a stream of well-mixed words. */
function splitmix32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x9e3779b9) >>> 0
    let z = state
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad)
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97)
    return (z ^ (z >>> 15)) >>> 0
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0
}

/** Deterministic xoshiro128** generator. Same seed ⇒ same sequence. */
export function createSeededRng(seed: number): Rng {
  const mix = splitmix32(seed)
  let s0 = mix()
  let s1 = mix()
  let s2 = mix()
  let s3 = mix()
  // xoshiro must never have an all-zero state.
  if ((s0 | s1 | s2 | s3) === 0) s0 = 1

  return createRngFromSource(() => {
    const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0
    const t = (s1 << 9) >>> 0
    s2 = (s2 ^ s0) >>> 0
    s3 = (s3 ^ s1) >>> 0
    s1 = (s1 ^ s2) >>> 0
    s0 = (s0 ^ s3) >>> 0
    s2 = (s2 ^ t) >>> 0
    s3 = rotl(s3, 11)
    return result
  })
}
