import { BASE_PAYTABLE, type Paytable } from '../../src/models/paytable'

/**
 * The pass-1 (draft v0) paytable, frozen for tests. The pass-1 evaluator cases use it
 * so their expected coins stay exactly as they were, which shows the evaluator's
 * base-game behaviour did not change when v1 pays and wild multipliers arrived.
 */
export const PASS1_PAYTABLE: Paytable = {
  ...BASE_PAYTABLE,
  ways: {
    WHALE:    [0, 0, 40, 150, 300, 500],
    SHARK:    [0, 0, 15,  75, 180, 300],
    OCTOPUS:  [0, 0, 15,  60, 150, 250],
    TURTLE:   [0, 0,  0,  35,  90, 180],
    ANGLER:   [0, 0,  0,  30,  80, 160],
    PEARL:    [0, 0,  0,  12,  50, 120],
    SHELL:    [0, 0,  0,  10,  40, 100],
    STARFISH: [0, 0,  0,   8,  25,  80],
    ANCHOR:   [0, 0,  0,   5,  20,  60],
  },
  scatter: {
    symbol: 'CHEST',
    betMultipliers: [0, 0, 0, 2, 10, 50],
    freeSpins: [0, 0, 0, 8, 12, 20],
  },
}
