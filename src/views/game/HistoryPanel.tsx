import type { HistoryEntry } from '../../controllers/slotReducer'

const fmt = (n: number) => n.toLocaleString('en-US')

/** Session history: the last 50 spins, newest first. */
export default function HistoryPanel({ history }: { readonly history: readonly HistoryEntry[] }) {
  return (
    <details className="history-panel">
      <summary>Session history ({history.length})</summary>
      {history.length === 0 ? (
        <p>No spins yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Bet</th>
              <th scope="col">Win</th>
              <th scope="col">Feature</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.id}</td>
                <td>✦ {fmt(h.bet)}</td>
                <td className={h.winPearls > 0 ? 'history-panel__win' : undefined}>✦ {fmt(h.winPearls)}</td>
                <td>{h.freeSpins > 0 ? `${h.freeSpins} free spins${h.capped ? ' (cap)' : ''}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  )
}
