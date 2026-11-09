import { describe, expect, it } from 'vitest'
import { computeBaseRtp } from '../../src/models/exactRtp'
import { BASE_PAYTABLE } from '../../src/models/paytable'
import { BASE_STRIPS } from '../../src/models/reelStrips'
import { createSeededRng } from '../../src/models/rng'
import { spinBase } from '../../src/models/spin'

// 1M seeded base spins should land within 4 standard errors of the exact RTP.
describe('base-game simulation vs exact RTP (v1 strips)', () => {
  it('1,000,000 seeded spins agree with computeBaseRtp', () => {
    const N = 1_000_000
    const bet = BASE_PAYTABLE.coinsPerBet
    const rng = createSeededRng(20261109)
    let sum = 0
    let sumSq = 0
    let hits = 0
    let triggers = 0
    for (let i = 0; i < N; i++) {
      const r = spinBase(rng, BASE_STRIPS, BASE_PAYTABLE)
      const x = r.totalCoins / bet
      sum += x
      sumSq += x * x
      if (r.totalCoins > 0 || r.freeSpinsAwarded > 0) hits++
      if (r.freeSpinsAwarded > 0) triggers++
    }
    const mean = sum / N
    const sd = Math.sqrt(sumSq / N - mean * mean)
    const stdErr = sd / Math.sqrt(N)
    const exact = computeBaseRtp(BASE_STRIPS, BASE_PAYTABLE)

    console.log(
      `[sim] base RTP sim=${(mean * 100).toFixed(3)}% exact=${(exact.rtp * 100).toFixed(4)}% ` +
        `sd/spin=${sd.toFixed(3)}x bet  z=${((mean - exact.rtp) / stdErr).toFixed(2)}  ` +
        `hitFreq=${((hits / N) * 100).toFixed(2)}%  trigger 1 in ${(N / triggers).toFixed(1)} ` +
        `(exact 1 in ${(1 / exact.featureTriggerProbability).toFixed(1)})`,
    )

    expect(Math.abs(mean - exact.rtp)).toBeLessThan(4 * stdErr)
  }, 60_000)
})
