import { SYMBOL_NAMES, type ReelSetView } from '../../controllers/reelPresentation'
import type { WinCycleStep } from '../../controllers/useWinCycle'
import frame from '../../assets/ui/reel_frame.png'
import cellHighlight from '../../assets/ui/cell_highlight.png'
import { LAYOUT } from './layout'
import Reel from './Reel'
import { BADGE_ART } from './symbolArt'

interface ReelSetProps {
  readonly reels: ReelSetView
  readonly reelsStopped: number
  readonly reelsMoving: boolean
  readonly slammed: boolean
  readonly showHighlights: boolean
  readonly highlightStep: WinCycleStep
  readonly scale: number
  readonly reducedMotion: boolean
}

/** Reel frame, the five reels, and the overlay for win highlights and wild badges. */
export default function ReelSet(props: ReelSetProps) {
  const { reels, reelsStopped, reelsMoving, slammed, showHighlights, highlightStep, scale, reducedMotion } = props
  const f = LAYOUT.reel_frame
  const cell = LAYOUT.cell * scale
  const highlights = reels.winHighlights
  const lit = (reel: number, row: number) =>
    highlightStep === 'all'
      ? highlights.some((h) => h.cells[reel][row])
      : (highlights[highlightStep]?.cells[reel][row] ?? false)
  const highlighting = showHighlights && highlights.length > 0

  const summary = reelsMoving
    ? 'Reels spinning'
    : 'Reels: ' +
      reels.grid
        .map((col, r) => `reel ${r + 1}: ${col.map((s) => SYMBOL_NAMES[s]).join(', ')}`)
        .join('; ')

  return (
    <div
      className="reel-frame"
      data-testid="reels"
      data-mode={reels.mode}
      data-stops={reelsMoving ? undefined : reels.stops.join(',')}
      role="img"
      aria-label={summary}
      style={{ width: f.w * scale, height: f.h * scale, backgroundImage: `url(${frame})` }}
    >
      <div
        className="reel-window"
        style={{ left: f.inner.x * scale, top: f.inner.y * scale, width: f.inner.w * scale, height: f.inner.h * scale }}
      >
        {reels.stripFaces.map((faces, r) => (
          <Reel
            key={`${reels.mode}-${r}`}
            faces={faces}
            stop={reels.stops[r]}
            spinning={reelsMoving && r >= reelsStopped}
            slammed={slammed}
            cell={cell}
            reducedMotion={reducedMotion}
          />
        ))}
        <div className="cell-overlay" aria-hidden="true">
          {reels.grid.map((col, r) =>
            col.map((_, row) => {
              const landed = !reelsMoving || r < reelsStopped
              const multiplier = reels.wildMultipliers?.[r][row] ?? 0
              const on = highlighting && lit(r, row)
              return (
                <div
                  key={`${r}-${row}`}
                  className={`cell${highlighting && !on ? ' cell--dim' : ''}`}
                  style={{ left: r * cell, top: row * cell, width: cell, height: cell }}
                >
                  {landed && multiplier > 0 && BADGE_ART[multiplier] && (
                    <img className="cell__badge" src={BADGE_ART[multiplier]} alt="" width={cell} height={cell} data-multiplier={multiplier} />
                  )}
                  {on && <img className="cell__highlight" src={cellHighlight} alt="" width={cell} height={cell} />}
                </div>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
