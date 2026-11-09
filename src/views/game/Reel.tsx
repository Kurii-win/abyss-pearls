import { useLayoutEffect, useRef } from 'react'
import type { SymbolFace } from '../../controllers/reelPresentation'
import Symbol from './Symbol'

interface ReelProps {
  /** Faces of the whole strip, top to bottom (it loops). */
  readonly faces: readonly SymbolFace[]
  /** Top-row index the reel lands on (already decided by the model). */
  readonly stop: number
  readonly spinning: boolean
  /** True if the player slam-stopped: land fast. */
  readonly slammed: boolean
  readonly cell: number
  readonly reducedMotion: boolean
}

/** Strip copies rendered back to back so the loop never shows a gap. */
const COPIES = 3
/** Scroll speed while spinning, in cells per second. */
const CELLS_PER_SECOND = 18
/** The landing glide starts this many cells above the stop. */
const LANDING_CELLS = 4

/**
 * One reel: the real strip, scrolling downward and looping while it spins, then gliding
 * onto `stop`. It never chooses where to stop; it only animates to the given stop.
 */
export default function Reel({ faces, stop, spinning, slammed, cell, reducedMotion }: ReelProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const wasSpinning = useRef(false)
  const n = faces.length
  // The middle copy holds the resting window, so there is room above and below it.
  const restY = -(n + stop) * cell

  useLayoutEffect(() => {
    const el = stripRef.current
    if (!el || typeof el.animate !== 'function') return
    if (spinning) {
      wasSpinning.current = true
      if (reducedMotion) return
      const loop = el.animate(
        [{ transform: `translateY(${-2 * n * cell}px)` }, { transform: `translateY(${-n * cell}px)` }],
        { duration: (n / CELLS_PER_SECOND) * 1000, iterations: Infinity },
      )
      return () => loop.cancel()
    }
    if (!wasSpinning.current) return
    wasSpinning.current = false
    if (reducedMotion) return
    const land = el.animate(
      [{ transform: `translateY(${restY - LANDING_CELLS * cell}px)` }, { transform: `translateY(${restY}px)` }],
      { duration: slammed ? 140 : 380, easing: 'cubic-bezier(0.2, 0.9, 0.35, 1.2)' },
    )
    return () => land.cancel()
    // restY and slammed are read at the moment the reel stops; they must not restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, reducedMotion, n, cell])

  const cells: SymbolFace[] = []
  for (let c = 0; c < COPIES; c++) cells.push(...faces)

  return (
    <div className={`reel${spinning ? ' reel--spinning' : ''}`} style={{ width: cell, height: cell * 3 }}>
      <div className="reel__strip" ref={stripRef} style={{ transform: `translateY(${restY}px)` }}>
        {cells.map((face, i) => (
          <Symbol key={i} face={face} size={cell} />
        ))}
      </div>
    </div>
  )
}
