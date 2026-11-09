import type { SymbolFace } from '../../controllers/reelPresentation'
import { SYMBOL_ART } from './symbolArt'

interface SymbolProps {
  readonly face: SymbolFace
  /** Cell size in CSS pixels (48 × integer scale). */
  readonly size: number
}

/** One pixel-art symbol cell. Decorative: the reels expose a text summary instead. */
export default function Symbol({ face, size }: SymbolProps) {
  return (
    <img
      className="symbol"
      src={SYMBOL_ART[face]}
      alt=""
      width={size}
      height={size}
      draggable={false}
      data-face={face}
    />
  )
}
