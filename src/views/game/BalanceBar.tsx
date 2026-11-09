import { useCountUp } from '../../controllers/useCountUp'
import bar from '../../assets/ui/balance_bar.png'
import { LAYOUT } from './layout'

interface BalanceBarProps {
  readonly balance: number
  readonly bet: number
  readonly win: number
  readonly countUpMs: number
  readonly scale: number
}

const fmt = (n: number) => n.toLocaleString('en-US')

/** Balance / bet / win, rendered as DOM text inside the balance_bar art wells. */
export default function BalanceBar({ balance, bet, win, countUpMs, scale }: BalanceBarProps) {
  const shownBalance = useCountUp(balance, countUpMs)
  const shownWin = useCountUp(win, countUpMs)
  const b = LAYOUT.balance_bar
  const values: Record<string, { label: string; value: number; shown: number }> = {
    balance: { label: 'Balance', value: balance, shown: shownBalance },
    bet: { label: 'Bet', value: bet, shown: bet },
    win: { label: 'Win', value: win, shown: shownWin },
  }

  return (
    <div className="balance-bar" style={{ width: b.w * scale }}>
      <div className="balance-bar__labels" aria-hidden="true">
        {b.segments.map((s) => (
          <span key={s.name} style={{ left: s.x * scale, width: s.w * scale }}>
            {values[s.name].label}
          </span>
        ))}
      </div>
      <div className="balance-bar__art" style={{ height: b.h * scale, backgroundImage: `url(${bar})` }}>
        {b.segments.map((s) => {
          const v = values[s.name]
          return (
            <output
              key={s.name}
              className={`balance-bar__well balance-bar__well--${s.name}`}
              data-testid={s.name}
              data-value={v.value}
              aria-label={`${v.label}: ${fmt(v.value)} Pearls`}
              style={{ left: s.x * scale, top: s.y * scale, width: s.w * scale, height: s.h * scale }}
            >
              ✦ {fmt(v.shown)}
            </output>
          )
        })}
      </div>
    </div>
  )
}
