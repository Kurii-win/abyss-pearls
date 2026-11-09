import { describe, expect, it } from 'vitest'
import { computeCodeHash, hashSources, RULE_SOURCE_FILES } from '../sim/codeHash'

describe('codeHash (rule source fingerprint)', () => {
  const files = [
    { path: 'a.ts', text: 'export const x = 1\n// note\n' },
    { path: 'b.ts', text: 'export const y = 2\n' },
  ]

  it('is deterministic', () => {
    expect(hashSources(files)).toBe(hashSources(files.map((f) => ({ ...f }))))
    expect(hashSources(files)).toMatch(/^[0-9a-f]{16}$/)
  })

  it('changes when any character changes, comments included', () => {
    const edited = [{ ...files[0], text: files[0].text.replace('note', 'Note') }, files[1]]
    expect(hashSources(edited)).not.toBe(hashSources(files))
  })

  it('depends on file paths and order', () => {
    expect(hashSources([files[1], files[0]])).not.toBe(hashSources(files))
    expect(hashSources([{ ...files[0], path: 'c.ts' }, files[1]])).not.toBe(hashSources(files))
  })

  it('ignores CRLF vs LF line endings', () => {
    const crlf = files.map((f) => ({ ...f, text: f.text.replace(/\n/g, '\r\n') }))
    expect(hashSources(crlf)).toBe(hashSources(files))
  })

  it('reads every rule file from disk', () => {
    expect(RULE_SOURCE_FILES).toContain('src/models/evaluator.ts')
    expect(computeCodeHash()).toMatch(/^[0-9a-f]{16}$/)
    expect(() => computeCodeHash('/nonexistent-root')).toThrow()
  })
})
