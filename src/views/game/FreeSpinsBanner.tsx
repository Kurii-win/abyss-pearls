import type { FeatureView } from '../../controllers/reelPresentation'

interface FreeSpinsBannerProps {
  readonly feature: FeatureView
  readonly onSkip: () => void
}

const fmt = (n: number) => n.toLocaleString('en-US')

/** Free-spins counter, retrigger notice, running feature win and Skip. */
export default function FreeSpinsBanner({ feature, onSkip }: FreeSpinsBannerProps) {
  return (
    <div className="free-spins-banner" data-testid="free-spins-banner">
      <span className="free-spins-banner__title">Abyss Dive</span>
      <span data-testid="free-spin-counter">
        Free spin {feature.spinNumber} / {feature.totalSpins}
      </span>
      {feature.retriggerSpins > 0 && <span className="free-spins-banner__retrigger">+{feature.retriggerSpins} free spins!</span>}
      <span>
        Feature win <strong data-testid="feature-win">✦ {fmt(feature.featureWinPearls)}</strong>
      </span>
      {feature.cappedShown && <span className="free-spins-banner__cap">Win cap reached</span>}
      {feature.stage !== 'outro' && (
        <button type="button" className="chip" onClick={onSkip} data-testid="skip-feature">
          Skip
        </button>
      )}
    </div>
  )
}
