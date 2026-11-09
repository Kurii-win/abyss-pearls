/**
 * Cycle through win highlights: first all wins together ('all'), then each one in turn.
 * `key` identifies the set of wins; a new key restarts the cycle.
 */
import { useEffect, useState } from 'react'

export type WinCycleStep = 'all' | number

export function useWinCycle(key: string, count: number, cycleMs: number): WinCycleStep {
  const [cycle, setCycle] = useState({ key, step: 0 })

  useEffect(() => {
    if (count <= 1) return
    const id = setInterval(() => {
      setCycle((c) => ({ key, step: c.key === key ? c.step + 1 : 1 }))
    }, cycleMs)
    return () => clearInterval(id)
  }, [key, count, cycleMs])

  const step = (cycle.key === key ? cycle.step : 0) % (count + 1)
  return count <= 1 || step === 0 ? 'all' : step - 1
}
