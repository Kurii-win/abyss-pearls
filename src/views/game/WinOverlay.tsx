import type { FeatureView } from '../../controllers/reelPresentation'
import { useCountUp } from '../../controllers/useCountUp'

const fmt = (n: number) => n.toLocaleString('en-US')

interface WinOverlayProps {
  readonly bigWin: { readonly pearls: number; readonly times: number } | null
  readonly feature: FeatureView | null
  readonly countUpMs: number
  readonly onSkip: () => void
  readonly onContinue: () => void
}

/** Panels over the reels: big win (≥ 20× bet), free-spins intro, and free-spins total. */
export default function WinOverlay({ bigWin, feature, countUpMs, onSkip, onContinue }: WinOverlayProps) {
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
      <div className="win-overlay win-overlay--big" data-testid="big-win">
        <p className="win-overlay__kicker">Big Win</p>
        <p className="win-overlay__headline">✦ {fmt(bigWinShown)}</p>
        <p>{bigWin.times}× bet</p>
      </div>
    )
  }
  return null
}
