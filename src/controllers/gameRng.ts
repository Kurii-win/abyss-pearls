/**
 * Picks the RNG for live play.
 *
 * Production: always crypto.getRandomValues (createCryptoRng).
 * Dev server only: `?seed=N` (N a non-negative 32-bit integer) gives a seeded RNG so
 * e2e tests are reproducible (DECISIONS 2026-11-09). The branch sits behind
 * `import.meta.env.DEV`, which Vite replaces with `false` in a production build, so the
 * seeded path (and createSeededRng itself) is removed from the bundle.
 */
import { createCryptoRng, createSeededRng, type Rng } from '../models/rng'

/** Parse `?seed=` from a query string; null if absent or not a uint32. */
export function parseSeedParam(search: string): number | null {
  const raw = new URLSearchParams(search).get('seed')
  if (raw === null || !/^\d{1,10}$/.test(raw)) return null
  const n = Number(raw)
  return n <= 0xffff_ffff ? n : null
}

export function createGameRng(): Rng {
  if (import.meta.env.DEV) {
    const seed = typeof window === 'undefined' ? null : parseSeedParam(window.location.search)
    if (seed !== null) return createSeededRng(seed)
  }
  return createCryptoRng()
}
