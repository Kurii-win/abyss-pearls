/**
 * Tween a displayed number up to `target` (balance and win count-up). Decreases
 * (a bet being taken) snap immediately. Presentation only: the target is decided.
 */
import { useEffect, useRef, useState } from 'react'

const easeOut = (t: number) => 1 - (1 - t) ** 3

export function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)

  useEffect(() => {
    const from = valueRef.current
    if (from === target) return
    const instant = durationMs <= 0 || target < from
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = instant ? 1 : Math.min(1, (now - start) / durationMs)
      const v = t >= 1 ? target : Math.round(from + (target - from) * easeOut(t))
      valueRef.current = v
      setValue(v)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
