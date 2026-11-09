import type { BetLock } from '../../controllers/useSlotMachine'

interface BetSelectorProps {
  readonly options: readonly number[]
  readonly level: number
  /** Why the chips are locked, or null when the bet can be changed. */
  readonly lock: BetLock
  readonly onChange: (level: number) => void
}

const LOCK_TEXT: Readonly<Record<Exclude<BetLock, null>, string>> = {
  feature: 'Bet is locked during free spins. It can be changed when the feature ends.',
  round: 'Bet can be changed when the reels are idle.',
}

/** Choose the total bet (25 / 50 / 100 / 250 ✦). Only enabled between spins. */
export default function BetSelector({ options, level, lock, onChange }: BetSelectorProps) {
  const hint = lock ? LOCK_TEXT[lock] : undefined
  return (
    <div className="bet-selector-wrap">
      <fieldset
        className="bet-selector"
        disabled={lock !== null}
        title={hint}
        aria-describedby={lock === 'feature' ? 'bet-lock-hint' : undefined}
      >
        <legend>Bet</legend>
        {options.map((bet, i) => (
          <button
            key={bet}
            type="button"
            className="chip"
            aria-pressed={i === level}
            data-testid={`bet-${bet}`}
            onClick={() => onChange(i)}
          >
            ✦ {bet}
          </button>
        ))}
      </fieldset>
      {/* Shown only for the feature: a normal spin's lock is too brief to explain on screen. */}
      {lock === 'feature' && (
        <p className="hint bet-lock-hint" id="bet-lock-hint" data-testid="bet-lock-hint">
          {LOCK_TEXT.feature}
        </p>
      )}
    </div>
  )
}
