import type { CSSProperties } from 'react'
import type { FeatureView } from '../../controllers/reelPresentation'
import { useCountUp } from '../../controllers/useCountUp'

const fmt = (n: number) => n.toLocaleString('en-US')

interface WinOverlayProps {
  readonly bigWin: { readonly pearls: number; readonly times: number } | null
  readonly feature: FeatureView | null
  readonly countUpMs: number
  readonly onSkip: () => void
  readonly onContinue: () => void
  /** End the big-win celebration early. */
  readonly onSkipBigWin: () => void
  readonly reducedMotion: boolean
}

const PEARLS = 28
/** Golden angle: spreads the pearls evenly without any randomness. */
const GOLDEN_ANGLE = 137.508

/**
 * A burst of pearls flying out from the middle. Positions and delays are a fixed
 * pattern (no randomness): the celebration is decoration, never an outcome.
 */
function PearlBurst() {
  return (
    <div className="pearl-burst" aria-hidden="true" data-testid="pearl-burst">
      {Array.from({ length: PEARLS }, (_, i) => {
        const angle = (i * GOLDEN_ANGLE * Math.PI) / 180
        const distance = 70 + ((i * 37) % 90)
        const style = {
          '--dx': `${Math.round(Math.cos(angle) * distance * 1.6)}px`,
          '--dy': `${Math.round(Math.sin(angle) * distance)}px`,
          '--delay': `${(i % 7) * 90}ms`,
          '--size': `${6 + (i % 3) * 3}px`,
        } as CSSProperties
        return <span key={i} className="pearl-burst__pearl" style={style} />
      })}
    </div>
  )
}

/** Panels over the reels: big win (≥ 20× bet), free-spins intro, and free-spins total. */
export default function WinOverlay(props: WinOverlayProps) {
  const { bigWin, feature, countUpMs, onSkip, onContinue, onSkipBigWin, reducedMotion } = props
  const bigWinShown = useCountUp(bigWin?.pearls ?? 0, countUpMs * 2)

  if (feature?.stage === 'intro') {
    return (
      <div className="win-overlay win-overlay--feature" data-testid="feature-intro">
        <p className="win-overlay__kicker">Abyss Dive</p>
        <p className="win-overlay__headline">{feature.initialSpins} Free Spins</p>
        <p>Every Kraken Eye wild lands with a ×2 or ×3 multiplier.</p>
        <button type="button" className="chip" onClick={onSkip}>
          Skip to total
        </button>
      </div>
    )
  }
  if (feature?.stage === 'outro') {
    return (
      <div className="win-overlay win-overlay--feature" data-testid="feature-outro" data-total={feature.roundWinPearls}>
        <p className="win-overlay__kicker">Abyss Dive complete</p>
        <p className="win-overlay__headline">✦ {fmt(feature.featureWinPearls)}</p>
        <p>
          {feature.spinNumber} free spins · round total ✦ {fmt(feature.roundWinPearls)}
        </p>
        {feature.cappedShown && <p className="win-overlay__cap">Win cap reached</p>}
        <button type="button" className="chip" onClick={onContinue}>
          Continue
        </button>
      </div>
    )
  }
  if (bigWin) {
    return (
      // Tap anywhere on the celebration (or press Space) to skip it.
      <div className="win-overlay win-overlay--big" data-testid="big-win" onClick={onSkipBigWin}>
        {!reducedMotion && <PearlBurst />}
        <p className="win-overlay__kicker">Big Win</p>
        <p className="win-overlay__headline">✦ {fmt(bigWinShown)}</p>
        <p>{bigWin.times}× bet</p>
        <button type="button" className="chip win-overlay__skip" data-testid="skip-big-win">
          Tap or press Space to skip
        </button>
      </div>
    )
  }
  return null
}
