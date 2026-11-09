import { useId } from 'react'
import { MIN_TICK_PX, type DistributionPanel } from '../../controllers/rtpReportView'

interface WinDistributionChartProps {
  readonly panel: DistributionPanel
  /** SVG user units across; chosen per breakpoint so text stays legible. */
  readonly width: number
}

const ROW = 30
const BAR = 18
const TOP = 6
const VALUE_ROOM = 72
/** Bars thinner than this are drawn as a tick so a non-zero share never disappears (noted in the caption). */
const MIN_TICK = MIN_TICK_PX

/**
 * Horizontal bar chart in inline SVG. One hue, bars start at zero, each bar labelled
 * with its value; the same data is available as a table.
 */
export default function WinDistributionChart({ panel, width }: WinDistributionChartProps) {
  const id = useId()
  const labelWidth = width < 420 ? 82 : 104
  const barArea = width - labelWidth - VALUE_ROOM
  const height = TOP + panel.bars.length * ROW + 8
  const titleId = `${id}-title`
  const descId = `${id}-desc`

  return (
    <figure className="chart" data-testid={`chart-${panel.id}`}>
      <h3 id={titleId}>{panel.title}</h3>
      <p className="note" id={descId}>
        {panel.caption}
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId} aria-describedby={descId} style={{ maxWidth: width }}>
        <title>{`${panel.title}: ${panel.bars.map((b) => `${b.label} ${b.share}`).join(', ')}`}</title>
        <line className="chart__axis" x1={labelWidth} x2={labelWidth} y1={TOP - 2} y2={height - 6} />
        {panel.bars.map((b, i) => {
          const y = TOP + i * ROW
          const raw = b.relative * barArea
          const w = b.relative > 0 ? Math.max(raw, MIN_TICK) : 0
          return (
            <g key={b.label}>
              <text className="chart__label" x={labelWidth - 8} y={y + BAR / 2} dominantBaseline="central" textAnchor="end">
                {b.label}
              </text>
              {w > 0 && <rect className="chart__bar" x={labelWidth} y={y} width={w} height={BAR} rx={raw < 4 ? 0 : 2} />}
              <text className="chart__value" x={labelWidth + w + 6} y={y + BAR / 2} dominantBaseline="central">
                {b.share}
              </text>
            </g>
          )
        })}
      </svg>
      <details>
        <summary>Show the data as a table</summary>
        <div className="data-table-wrap">
          <table className="data-table">
            <caption>{panel.title}</caption>
            <thead>
              <tr>
                <th scope="col">Win (× bet)</th>
                <th scope="col" className="num">
                  Spins
                </th>
                <th scope="col" className="num">
                  Share
                </th>
                <th scope="col" className="num">
                  Chance
                </th>
              </tr>
            </thead>
            <tbody>
              {panel.bars.map((b) => (
                <tr key={b.label}>
                  <th scope="row">{b.label}</th>
                  <td className="num">{b.count}</td>
                  <td className="num">{b.share}</td>
                  <td className="num">{b.oneIn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
