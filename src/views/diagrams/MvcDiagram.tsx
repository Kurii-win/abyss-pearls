import { useId } from 'react'
import { ArrowDefs, Arrow } from './Arrow'

interface Layer {
  readonly kind: 'model' | 'controller' | 'view'
  readonly title: string
  readonly lines: readonly string[]
  readonly rule: string
}

const LAYERS: readonly Layer[] = [
  {
    kind: 'model',
    title: 'models/',
    lines: ['Pure TypeScript', 'rng · reelStrips · paytable', 'evaluator · freeSpins', 'spin · wallet · types'],
    rule: 'no React, controllers/, views/',
  },
  {
    kind: 'controller',
    title: 'controllers/',
    lines: ['Hooks and reducers', 'useSlotMachine', 'slotReducer (state machine)', 'rtpReportView · rulesView'],
    rule: 'imports models/, never views/',
  },
  {
    kind: 'view',
    title: 'views/',
    lines: ['React components', 'Reel · SpinButton', 'BalanceBar · WinOverlay', 'pages/'],
    rule: 'type-only imports from models/',
  },
]

/** models → controllers → views, with the ESLint layer rule under each box. */
export default function MvcDiagram({ vertical }: { readonly vertical: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const boxW = vertical ? 300 : 236
  const boxH = 128
  const ruleH = 34
  const gap = vertical ? 46 : 50
  const step = vertical ? boxH + ruleH + 8 + gap : boxW + gap
  const width = vertical ? 340 : LAYERS.length * boxW + (LAYERS.length - 1) * gap + 20
  const height = vertical ? LAYERS.length * step - gap + 20 : boxH + ruleH + 38
  const pad = 10

  return (
    <figure className="diagram" data-testid="mvc-diagram">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-t`} style={{ maxWidth: width }}>
        <title id={`${id}-t`}>
          Layer diagram: models feed controllers, controllers feed views. Lint rules: models import no React, controllers or
          views; controllers never import views; views only import types from models.
        </title>
        <ArrowDefs id={id} />
        {LAYERS.map((layer, i) => {
          const x = vertical ? (width - boxW) / 2 : pad + i * step
          const y = vertical ? pad + i * step : pad
          return (
            <g key={layer.kind}>
              <rect className={`diagram__box diagram__box--${layer.kind}`} x={x} y={y} width={boxW} height={boxH} rx={8} />
              <text className="diagram__title" x={x + 14} y={y + 26}>
                {layer.title}
              </text>
              {layer.lines.map((line, j) => (
                <text key={line} className={j === 0 ? 'diagram__muted' : 'diagram__text'} x={x + 14} y={y + 50 + j * 21}>
                  {line}
                </text>
              ))}
              <rect className="diagram__rule" x={x} y={y + boxH + 8} width={boxW} height={ruleH} rx={6} />
              <text className="diagram__muted" x={x + 10} y={y + boxH + 8 + ruleH / 2} dominantBaseline="central">
                {layer.rule}
              </text>
              {i < LAYERS.length - 1 &&
                (vertical ? (
                  <Arrow id={id} x1={width / 2} y1={y + boxH + ruleH + 12} x2={width / 2} y2={y + step - 4} />
                ) : (
                  <Arrow id={id} x1={x + boxW + 4} y1={y + boxH / 2} x2={x + step - 4} y2={y + boxH / 2} />
                ))}
            </g>
          )
        })}
      </svg>
      <figcaption className="note">
        Dashed boxes are import rules enforced by ESLint <code>no-restricted-imports</code>: <code>npm run lint</code> fails on
        any layer violation.
      </figcaption>
    </figure>
  )
}
