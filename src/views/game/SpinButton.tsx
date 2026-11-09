import type { SpinButtonMode } from '../../controllers/useSlotMachine'
import idle from '../../assets/ui/spin_button_idle.png'
import pressed from '../../assets/ui/spin_button_pressed.png'
import disabled from '../../assets/ui/spin_button_disabled.png'
import freespins from '../../assets/ui/spin_button_freespins.png'
import { LAYOUT } from './layout'

const ART: Readonly<Record<SpinButtonMode, string>> = { idle, stop: pressed, disabled, freespins }
const LABEL: Readonly<Record<SpinButtonMode, string>> = {
  idle: 'Spin',
  stop: 'Stop reels',
  disabled: 'Spin (unavailable)',
  freespins: 'Free spins playing',
}

interface SpinButtonProps {
  readonly mode: SpinButtonMode
  readonly enabled: boolean
  readonly scale: number
  readonly onPress: () => void
}

/** A real <button>: Spin when idle, slam-stop while the reels move. */
export default function SpinButton({ mode, enabled, scale, onPress }: SpinButtonProps) {
  const size = LAYOUT.spin_button.w * scale
  return (
    <button
      type="button"
      className={`spin-button spin-button--${mode}`}
      data-testid="spin-button"
      data-mode={mode}
      aria-label={mode === 'freespins' && enabled ? 'Stop reels' : LABEL[mode]}
      disabled={!enabled}
      onClick={onPress}
      style={{ width: size, height: size }}
    >
      <img src={ART[mode]} alt="" width={size} height={size} draggable={false} />
    </button>
  )
}
