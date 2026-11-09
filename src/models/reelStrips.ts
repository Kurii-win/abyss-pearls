/**
 * Reel strips v1, tuned in M1 pass 2 (docs/MATH.md). Base game and free spins
 * ("Abyss Dive") use separate strips.
 *
 * Rules for both sets (checked by tests/unit/reelStrips.test.ts):
 * - WILD only on reels 2–4.
 * - At most one CHEST visible per reel: chests are at least ROWS stops apart, circularly.
 * - WHALE appears in stacks of 1–3 consecutive stops.
 * - Strips wrap around: the stop after the last entry is the first entry.
 */
import type { ReelStrips, SymbolId } from './types'

const WH: SymbolId = 'WHALE'
const SH: SymbolId = 'SHARK'
const OC: SymbolId = 'OCTOPUS'
const TU: SymbolId = 'TURTLE'
const AN: SymbolId = 'ANGLER'
const PE: SymbolId = 'PEARL'
const SE: SymbolId = 'SHELL'
const ST: SymbolId = 'STARFISH'
const AC: SymbolId = 'ANCHOR'
const WI: SymbolId = 'WILD'
const CH: SymbolId = 'CHEST'

/**
 * Base game v1. Starfish is clustered (pairs and runs), which lowers hit frequency
 * while keeping its RTP share. 2 chests on reels 1–4, 1 on reel 5 (trigger ≈ 1 in 152).
 */
export const BASE_STRIPS: ReelStrips = [
  // Reel 1 (58 stops: WH4 SH3 OC3 TU5 AN5 PE8 SE9 ST9 AC10 CH2)
  [
    CH, WH, ST, ST, ST, AC, ST, ST, PE, ST,
    ST, AC, SE, SE, AC, AN, PE, SE, SH, AN,
    AN, WH, WH, WH, PE, PE, AC, AC, AC, OC,
    TU, CH, SE, SE, PE, OC, SE, PE, SE, TU,
    SE, PE, AN, PE, SH, TU, OC, SE, AC, ST,
    ST, AC, AC, AC, SH, TU, AN, TU,
  ],
  // Reel 2 (59 stops: WH3 SH3 OC3 TU5 AN5 PE8 SE9 ST10 AC10 WI1 CH2)
  [
    CH, PE, TU, OC, SH, PE, TU, AC, AN, AN,
    PE, SE, TU, SE, ST, ST, AC, OC, AN, AC,
    AN, PE, WI, SH, TU, OC, ST, ST, CH, WH,
    ST, ST, SE, SE, WH, WH, ST, ST, AC, SE,
    SE, SE, PE, AC, AC, TU, PE, PE, AC, PE,
    AN, AC, ST, ST, SE, AC, SH, SE, AC,
  ],
  // Reel 3 (59 stops: WH3 SH3 OC3 TU5 AN5 PE8 SE9 ST10 AC10 WI1 CH2)
  [
    CH, WI, AC, SE, AC, PE, TU, TU, ST, ST,
    PE, SH, AC, AC, AN, PE, PE, SE, AC, ST,
    ST, PE, OC, TU, AC, OC, ST, ST, SE, CH,
    SE, AC, SH, PE, AC, AC, ST, ST, PE, AN,
    AN, SE, SE, SE, TU, AN, WH, WH, WH, AC,
    OC, AN, TU, SE, SE, ST, ST, SH, PE,
  ],
  // Reel 4 (59 stops: WH3 SH3 OC3 TU5 AN5 PE8 SE9 ST10 AC10 WI1 CH2)
  [
    CH, PE, TU, PE, AC, AN, PE, AC, AN, WI,
    PE, AC, OC, SE, SE, AC, SH, AC, PE, AC,
    SE, AC, SH, ST, ST, SE, AN, CH, SE, PE,
    SE, PE, TU, ST, ST, SH, AN, SE, ST, ST,
    TU, WH, TU, WH, WH, PE, AC, SE, ST, ST,
    ST, ST, AC, SE, TU, OC, AC, AN, OC,
  ],
  // Reel 5 (57 stops: WH4 SH3 OC3 TU5 AN5 PE8 SE9 ST9 AC10 CH1)
  [
    CH, AC, SE, SH, AC, AC, AN, AC, AC, TU,
    SE, OC, AN, PE, WH, WH, WH, AC, SE, PE,
    AC, PE, ST, WH, AC, ST, ST, AN, PE, TU,
    OC, AN, ST, ST, PE, SH, TU, SE, TU, PE,
    ST, ST, SE, SE, SE, AC, AC, PE, SE, SH,
    OC, SE, PE, ST, ST, AN, TU,
  ],
]

/**
 * Free spins v1: shorter strips with more whales, highs and 3 wilds on each of
 * reels 2–4. Each wild that lands here gets a ×2/×3 multiplier (paytable.ts).
 * One chest per reel, so 3+ chests (retrigger +5) are rare.
 */
export const FREE_SPIN_STRIPS: ReelStrips = [
  // Reel 1 (44 stops: WH5 SH3 OC3 TU4 AN4 PE6 SE6 ST6 AC6 CH1)
  [
    CH, PE, ST, AC, OC, AC, SH, AC, OC, WH,
    WH, WH, ST, SE, SH, SE, ST, PE, TU, WH,
    WH, SE, OC, TU, AN, AC, AN, PE, SH, ST,
    SE, AC, PE, PE, ST, TU, ST, SE, SE, PE,
    AC, TU, AN, AN,
  ],
  // Reel 2 (45 stops: WH3 SH3 OC3 TU4 AN4 PE6 SE6 ST6 AC6 WI3 CH1)
  [
    CH, TU, AN, AC, WI, SE, AN, SE, SH, PE,
    AN, TU, WH, WH, AC, PE, WI, SH, TU, ST,
    WI, ST, SE, ST, OC, ST, PE, TU, OC, AN,
    AC, ST, SH, AC, PE, ST, PE, PE, AC, OC,
    SE, AC, SE, SE, WH,
  ],
  // Reel 3 (45 stops: WH3 SH3 OC3 TU4 AN4 PE6 SE6 ST6 AC6 WI3 CH1)
  [
    CH, AC, ST, AC, SH, PE, SE, AC, AN, ST,
    PE, SE, ST, SE, OC, ST, SH, PE, ST, WI,
    OC, ST, TU, SE, WI, AC, AC, SE, AN, AN,
    AC, OC, AN, WI, SH, TU, PE, PE, PE, TU,
    TU, SE, WH, WH, WH,
  ],
  // Reel 4 (45 stops: WH3 SH3 OC3 TU4 AN4 PE6 SE6 ST6 AC6 WI3 CH1)
  [
    CH, OC, WI, ST, TU, PE, PE, AN, PE, PE,
    AN, AC, ST, WH, WH, SE, TU, AC, AN, ST,
    PE, ST, AC, AN, SE, SH, PE, SH, SE, SE,
    TU, WI, ST, ST, AC, AC, SE, SH, AC, OC,
    TU, WH, OC, SE, WI,
  ],
  // Reel 5 (44 stops: WH5 SH3 OC3 TU4 AN4 PE6 SE6 ST6 AC6 CH1)
  [
    CH, TU, WH, WH, WH, TU, PE, AC, AN, SE,
    ST, SE, SE, SE, SE, AN, ST, AC, PE, ST,
    PE, AC, PE, SH, PE, OC, OC, TU, ST, AC,
    ST, AN, ST, AC, SE, AC, WH, WH, SH, AN,
    OC, SH, PE, TU,
  ],
]
