import { describe, expect, it } from 'vitest'
import { extractInterface, SPIN_RESULT_SNIPPET } from '../../src/controllers/architectureView'
import { isRepeatedActivationKey } from '../../src/controllers/useSpinHotkey'

describe('SpinResult snippet (RGS seam)', () => {
  it('is cut from the real types.ts, without comments', () => {
    expect(SPIN_RESULT_SNIPPET.startsWith('export interface SpinResult {')).toBe(true)
    expect(SPIN_RESULT_SNIPPET.endsWith('}')).toBe(true)
    for (const field of ['stops', 'grid', 'wayWins', 'scatterWin', 'baseCoins', 'totalCoins', 'capped', 'feature']) {
      expect(SPIN_RESULT_SNIPPET).toMatch(new RegExp(`readonly ${field}:`))
    }
    expect(SPIN_RESULT_SNIPPET).not.toContain('/**')
    expect(SPIN_RESULT_SNIPPET).not.toMatch(/^\s*$/m)
  })

  it('extractInterface strips block and line comments and throws when missing', () => {
    const src = 'x\nexport interface A {\n  /** doc */\n  readonly a: number // note\n\n  readonly b: string\n}\nexport interface B {}'
    expect(extractInterface(src, 'A')).toBe('export interface A {\n  readonly a: number\n  readonly b: string\n}')
    expect(() => extractInterface(src, 'Missing')).toThrow()
  })
})

describe('Spin button key repeat (M3 issue 1)', () => {
  it('cancels only auto-repeated Enter / Space', () => {
    expect(isRepeatedActivationKey({ key: 'Enter', repeat: true })).toBe(true)
    expect(isRepeatedActivationKey({ key: ' ', repeat: true })).toBe(true)
    expect(isRepeatedActivationKey({ key: 'Enter', repeat: false })).toBe(false)
    expect(isRepeatedActivationKey({ key: 'a', repeat: true })).toBe(false)
  })
})
