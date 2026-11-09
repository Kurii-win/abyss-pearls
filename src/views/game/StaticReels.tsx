import type { SymbolFace } from '../../controllers/reelPresentation'
import reelFrame from '../../assets/ui/reel_frame.png'
import { LAYOUT } from './layout'
import Symbol from './Symbol'

interface StaticReelsProps {
  /** faces[reel][row], reels left to right. */
  readonly faces: readonly (readonly SymbolFace[])[]
  /** Integer display scale for the 48 px art. */
  readonly scale: number
  readonly label: string
}

/**
 * A still reel window in the real frame: decorative art for the Home hero. It is not a
 * game outcome and pays nothing; the game itself lives on /play.
 */
export default function StaticReels({ faces, scale, label }: StaticReelsProps) {
  const f = LAYOUT.reel_frame
  const cell = LAYOUT.cell * scale
  return (
    <div
      className="hero-reels"
      role="img"
      aria-label={label}
      style={{ width: f.w * scale, height: f.h * scale, backgroundImage: `url(${reelFrame})` }}
    >
      <div
        className="hero-reels__grid"
        style={{
          left: f.inner.x * scale,
          top: f.inner.y * scale,
          gridTemplateColumns: `repeat(${faces.length}, ${cell}px)`,
          gridAutoFlow: 'column',
          gridTemplateRows: `repeat(${faces[0]?.length ?? 0}, ${cell}px)`,
        }}
      >
        {faces.flatMap((reel, r) =>
          reel.map((face, row) => (
            <span key={`${r}-${row}`} className="pixel">
              <Symbol face={face} size={cell} />
            </span>
          )),
        )}
      </div>
    </div>
  )
}
