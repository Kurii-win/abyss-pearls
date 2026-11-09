import type { Grid, SymbolId } from '../../src/models/types'

const ABBR: Record<string, SymbolId> = {
  WH: 'WHALE', SH: 'SHARK', OC: 'OCTOPUS', TU: 'TURTLE', AN: 'ANGLER',
  PE: 'PEARL', SE: 'SHELL', ST: 'STARFISH', AC: 'ANCHOR', WI: 'WILD', CH: 'CHEST',
}

/** Build a grid from reel columns written as abbreviations, e.g. ['SE SE AC', ...]. */
export function grid(...reels: string[]): Grid {
  return reels.map((col) =>
    col.trim().split(/\s+/).map((a) => {
      const s = ABBR[a]
      if (!s) throw new Error(`unknown symbol abbreviation ${a}`)
      return s
    }),
  )
}
