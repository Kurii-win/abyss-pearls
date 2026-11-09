interface BetSelectorProps {
  readonly options: readonly number[]
  readonly level: number
  readonly disabled: boolean
  readonly onChange: (level: number) => void
}

/** Choose the total bet (25 / 50 / 100 / 250 ✦). Only enabled between spins. */
export default function BetSelector({ options, level, disabled, onChange }: BetSelectorProps) {
  return (
    <fieldset className="bet-selector" disabled={disabled}>
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
  )
}
