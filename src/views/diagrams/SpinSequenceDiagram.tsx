import { useId } from 'react'
import { Arrow, ArrowDefs } from './Arrow'

interface Actor {
  readonly name: string
  readonly layer: string
}

interface Message {
  readonly from: number
  readonly to: number
  readonly label: string
  readonly reply?: boolean
}

const ACTORS: readonly Actor[] = [
  { name: 'Player', layer: '' },
  { name: 'SpinButton', layer: 'view' },
  { name: 'useSlotMachine', layer: 'controller' },
  { name: 'spin(rng)', layer: 'model' },
  { name: 'slotReducer', layer: 'controller' },
  { name: 'Reels, overlays', layer: 'view' },
]

const MESSAGES: readonly Message[] = [
  { from: 0, to: 1, label: 'press Spin' },
  { from: 1, to: 2, label: 'pressSpin()' },
  { from: 2, to: 3, label: 'spin(rng, GAME_MATH)' },
  { from: 3, to: 2, label: 'SpinResult (settled)', reply: true },
  { from: 2, to: 4, label: "dispatch SPIN { result }" },
  { from: 4, to: 5, label: 'SPINNING → STOPPING → …' },
  { from: 5, to: 0, label: 'reveal reels, then wins', reply: true },
]

function Horizontal({ id }: { readonly id: string }) {
  const col = 132
  const left = 70
  const width = left * 2 + col * (ACTORS.length - 1)
  const top = 50
  const rowH = 44
  const height = top + MESSAGES.length * rowH + 24
  const xOf = (i: number) => left + i * col
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-t`} style={{ maxWidth: width }}>
      <title id={`${id}-t`}>{summary()}</title>
      <ArrowDefs id={id} />
      {ACTORS.map((a, i) => (
        <g key={a.name}>
          <rect className="diagram__box" x={xOf(i) - 62} y={4} width={124} height={38} rx={6} />
          <text className="diagram__code" x={xOf(i)} y={20} textAnchor="middle">
            {a.name}
          </text>
          {a.layer && (
            <text className="diagram__muted" x={xOf(i)} y={35} textAnchor="middle">
              {a.layer}
            </text>
          )}
          <line className="diagram__lifeline" x1={xOf(i)} x2={xOf(i)} y1={42} y2={height - 6} />
        </g>
      ))}
      {MESSAGES.map((m, i) => {
        const y = top + 20 + i * rowH
        const x1 = xOf(m.from)
        const x2 = xOf(m.to)
        const dir = Math.sign(x2 - x1)
        return (
          <g key={m.label}>
            <text className="diagram__text diagram__label" x={(x1 + x2) / 2} y={y - 8} textAnchor="middle">
              {i + 1}. {m.label}
            </text>
            <Arrow id={id} x1={x1 + dir * 3} y1={y} x2={x2 - dir * 5} y2={y} dashed={m.reply} />
          </g>
        )
      })}
    </svg>
  )
}

function Vertical({ id }: { readonly id: string }) {
  const width = 340
  const boxH = 50
  const gap = 22
  const height = MESSAGES.length * (boxH + gap) - gap + 8
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-t`} style={{ maxWidth: width }}>
      <title id={`${id}-t`}>{summary()}</title>
      <ArrowDefs id={id} />
      {MESSAGES.map((m, i) => {
        const y = 4 + i * (boxH + gap)
        return (
          <g key={m.label}>
            <rect className="diagram__box" x={10} y={y} width={width - 20} height={boxH} rx={6} />
            <text className="diagram__muted" x={22} y={y + 19}>
              {i + 1}. {ACTORS[m.from].name} → {ACTORS[m.to].name}
            </text>
            <text className="diagram__text" x={22} y={y + 38}>
              {m.label}
            </text>
            {i < MESSAGES.length - 1 && <Arrow id={id} x1={width / 2} y1={y + boxH + 2} x2={width / 2} y2={y + boxH + gap - 3} />}
          </g>
        )
      })}
    </svg>
  )
}

function summary(): string {
  return `Spin sequence: ${MESSAGES.map((m, i) => `${i + 1}. ${ACTORS[m.from].name} to ${ACTORS[m.to].name}: ${m.label}`).join('; ')}.`
}

/** Spin press → controller → model → SpinResult → reducer → views reveal. */
export default function SpinSequenceDiagram({ vertical }: { readonly vertical: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <figure className="diagram" data-testid="sequence-diagram">
      {vertical ? <Vertical id={id} /> : <Horizontal id={id} />}
      <figcaption className="note">
        Steps 2–5 run inside one click handler: the outcome exists after step 4, and on step 5 the reducer books the bet
        and the full win (including any free spins) before a single reel moves. Everything after that is presentation.
      </figcaption>
    </figure>
  )
}
