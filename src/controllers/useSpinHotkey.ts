/**
 * Space / Enter spins (or slam-stops) from anywhere on the page. When focus is on an
 * interactive control the browser's own activation runs instead, so nothing fires twice.
 * Pass `enabled = false` while a modal (e.g. the rules dialog) is open.
 */
import { useEffect } from 'react'

const INTERACTIVE = 'button, a, input, select, textarea, summary, [contenteditable="true"]'

export function useSpinHotkey(onSpin: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return
      e.preventDefault()
      onSpin()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSpin, enabled])
}

/**
 * Holding Enter on a focused <button> makes the browser fire a click on every
 * auto-repeated keydown. Spin must react to deliberate presses only, so the Spin
 * button cancels repeated activation keys (tester M3 issue 1).
 */
export function isRepeatedActivationKey(e: { readonly key: string; readonly repeat: boolean }): boolean {
  return e.repeat && (e.key === 'Enter' || e.key === ' ')
}
