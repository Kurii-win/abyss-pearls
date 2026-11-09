/** Shared arrow marker for the architecture diagrams. `id` must be unique per SVG. */
export function ArrowDefs({ id }: { readonly id: string }) {
  return (
    <defs>
      <marker id={`${id}-head`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path className="diagram__arrowhead" d="M0,0 L10,5 L0,10 z" />
      </marker>
    </defs>
  )
}

interface ArrowProps {
  readonly id: string
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly dashed?: boolean
}

export function Arrow({ id, x1, y1, x2, y2, dashed = false }: ArrowProps) {
  return (
    <line
      className={`diagram__arrow${dashed ? ' diagram__arrow--return' : ''}`}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      markerEnd={`url(#${id}-head)`}
    />
  )
}
