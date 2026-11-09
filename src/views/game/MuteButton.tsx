interface MuteButtonProps {
  readonly muted: boolean
  readonly onToggle: () => void
}

/** Toggle button: aria-pressed = sound is muted. The visible text says the current state. */
export default function MuteButton({ muted, onToggle }: MuteButtonProps) {
  return (
    <button
      type="button"
      className={`chip mute-button${muted ? ' mute-button--muted' : ''}`}
      aria-pressed={muted}
      aria-label="Mute sound"
      data-testid="mute-button"
      onClick={onToggle}
    >
      <span className="mute-button__icon" aria-hidden="true" />
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  )
}
