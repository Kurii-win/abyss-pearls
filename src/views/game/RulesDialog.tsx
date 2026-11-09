import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from 'react'
import { buildRulesView } from '../../controllers/rulesView'
import { SYMBOL_ART } from './symbolArt'

interface RulesDialogProps {
  readonly open: boolean
  /** Index into the bet levels; pays are shown in ✦ for this bet. */
  readonly betLevel: number
  readonly onClose: () => void
}

const FOCUSABLE = 'button:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])'

/**
 * Rules & paytable as a modal <dialog>: focus moves in on open, Tab is trapped inside,
 * Esc closes, and focus returns to whatever opened it. Every value comes from rulesView.
 */
export default function RulesDialog({ open, betLevel, onClose }: RulesDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const rules = useMemo(() => buildRulesView(betLevel), [betLevel])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
      returnTo.current?.focus()
      returnTo.current = null
    }
  }, [open])

  // Esc fires "cancel": keep React state in charge of closing.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  const trapTab = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Tab') return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog ref={ref} className="rules-dialog" aria-labelledby={titleId} onKeyDown={trapTab} data-testid="rules-dialog">
      {open && (
        <>
          <div className="rules-dialog__header">
            <h2 id={titleId}>Rules &amp; paytable</h2>
            <button type="button" className="chip" onClick={onClose} data-autofocus>
              Close
            </button>
          </div>
          <div className="rules-dialog__body">
            <p>
              Pays below are ✦ per way at the selected bet of <strong>{rules.betText}</strong>.
            </p>

            <h3>Symbol pays</h3>
            <div className="data-table-wrap" tabIndex={0} aria-label="Symbol pays table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Symbol</th>
                    {rules.lengths.map((n) => (
                      <th scope="col" className="num" key={n}>
                        {n} reels
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.symbols.map((s) => (
                    <tr key={s.id} data-symbol={s.id}>
                      <th scope="row">
                        <span className="rules-dialog__symbol">
                          <img className="pixel" src={SYMBOL_ART[s.face]} alt="" width={48} height={48} />
                          {s.name}
                        </span>
                      </th>
                      {s.pays.map((p) => (
                        <td className="num" key={p.length}>
                          {p.text}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>Wild</h3>
            <p className="rules-dialog__feature">
              <img className="pixel" src={SYMBOL_ART[rules.wild.face]} alt="" width={48} height={48} />
              <span>
                <strong>{rules.wild.name}.</strong> {rules.wild.text}
              </span>
            </p>

            <h3>Scatter</h3>
            <p className="rules-dialog__feature">
              <img className="pixel" src={SYMBOL_ART[rules.scatter.face]} alt="" width={48} height={48} />
              <span>
                <strong>{rules.scatter.name}.</strong> {rules.scatter.text}
              </span>
            </p>
            <ul>
              {rules.scatter.rows.map((r) => (
                <li key={r.count}>
                  {r.count} chests: {r.text}
                </li>
              ))}
            </ul>

            <h3>Ways to win</h3>
            <ul>
              {rules.ways.text.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            <h3>Abyss Dive free spins</h3>
            <ul>
              {rules.freeSpins.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            <h3>Limits and return</h3>
            <ul>
              <li>{rules.winCap}</li>
              <li>{rules.betRange}</li>
              <li data-testid="rules-rtp">{rules.rtp}</li>
            </ul>

            <div className="rules-dialog__notices" data-testid="rules-notices">
              {rules.notices.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          </div>
        </>
      )}
    </dialog>
  )
}
