/**
 * Fingerprint of the game's RULE CODE (Node only: reads files with fs).
 *
 * `mathHash` (src/models/mathVersion.ts) covers the data: strips, paytable, feature
 * settings. It cannot see a change to how that data is used, e.g. an edit to the ways
 * evaluator. This hash covers the source text of the rule files, so the report goes
 * stale on ANY edit to them (every file that affects the report's numbers), comments included (deliberately conservative).
 *
 * Lives here, not in src/models/, because models must stay browser-pure.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fnv1a64 } from '../../src/models/mathVersion'

/** Rule source files, relative to the project root, in hashing order. */
export const RULE_SOURCE_FILES = [
  'src/models/evaluator.ts',
  'src/models/freeSpins.ts',
  'src/models/spin.ts',
  'src/models/paytable.ts',
  'src/models/reelStrips.ts',
  'src/models/exactRtp.ts',
  'src/models/rng.ts',
  'src/models/types.ts',
] as const

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export interface SourceFile {
  path: string
  text: string
}

/**
 * Pure: hash of named source texts. Line endings are normalised to LF so a Windows
 * checkout (core.autocrlf) produces the same hash. The path is part of the input, so
 * moving code between files also changes the hash.
 */
export function hashSources(files: readonly SourceFile[]): string {
  const joined = files.map((f) => `--- ${f.path}\n${f.text.replace(/\r\n/g, '\n')}\n`).join('')
  return fnv1a64(joined)
}

/** Reads RULE_SOURCE_FILES from disk and hashes them. Throws if one is missing. */
export function computeCodeHash(root: string = PROJECT_ROOT): string {
  return hashSources(RULE_SOURCE_FILES.map((path) => ({ path, text: readFileSync(resolve(root, path), 'utf8') })))
}
