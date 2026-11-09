/**
 * Architecture page view model. The SpinResult snippet is cut from the real source of
 * src/models/types.ts at build time (Vite `?raw`), so the "RGS seam" shown on the site
 * can never drift from the contract the game actually uses.
 */
import typesSource from '../models/types.ts?raw'

/**
 * Extract `export interface <name> { ... }` from TypeScript source, dropping comments
 * and blank lines (a trimmed, readable version of the contract).
 */
export function extractInterface(source: string, name: string): string {
  const start = source.indexOf(`export interface ${name} {`)
  if (start < 0) throw new Error(`interface ${name} not found`)
  const end = source.indexOf('\n}', start)
  if (end < 0) throw new Error(`interface ${name} is not closed`)
  const body = source.slice(start, end + 2)
  return body
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\s*\/\/.*$/, '').trimEnd())
    .filter((line) => line.trim().length > 0)
    .join('\n')
}

export const SPIN_RESULT_SNIPPET: string = extractInterface(typesSource, 'SpinResult')
