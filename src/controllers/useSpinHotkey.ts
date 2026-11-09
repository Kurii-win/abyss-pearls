/**
 * Space / Enter spins (or slam-stops) from anywhere on the page. When focus is on an
 * interactive control the browser's own activation runs instead, so nothing fires twice.
 */
import { useEffect } from 'react'

const INTERACTIVE = 'button, a, input, select, textarea, summary, [contenteditable="true"]'

export function useSpinHotkey(onSpin: () => void): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return
      e.preventDefault()
      onSpin()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSpin])
}
