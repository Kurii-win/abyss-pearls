/**
 * A fingerprint of everything that defines the game's math (strips, paytable, feature
 * rules, cap). The simulation writes it into reports/rtp-report.json, so the Math &
 * Fairness page can show which math produced the numbers, and tests can check that
 * the report still matches the current code.
 */
import type { GameMath } from './spin'

/** Human label for the tuned math; bump when strips or pays change. */
export const MATH_VERSION_LABEL = 'v1'

/** Canonical JSON of the math (key order fixed by construction). */
export function canonicalMath(math: GameMath): string {
  const fs = math.freeSpins
  return JSON.stringify({
    rows: math.rows,
    winCapCoins: math.winCapCoins,
    baseStrips: math.baseStrips,
    basePaytable: math.basePaytable,
    freeSpins: {
      strips: fs.strips,
      paytable: fs.paytable,
      wildMultiplierWeights: fs.wildMultiplierWeights,
      retriggerSpins: fs.retriggerSpins,
      maxSpins: fs.maxSpins,
      rows: fs.rows,
    },
  })
}

/** 64-bit FNV-1a over the UTF-16 code units of `text`, as 16 hex digits. */
export function fnv1a64(text: string): string {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  const mask = 0xffffffffffffffffn
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i))
    hash = (hash * prime) & mask
  }
  return hash.toString(16).padStart(16, '0')
}

export function mathHash(math: GameMath): string {
  return fnv1a64(canonicalMath(math))
}
