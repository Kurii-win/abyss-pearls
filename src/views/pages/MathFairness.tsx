import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { RTP_REPORT_VIEW, type StatItem } from '../../controllers/rtpReportView'
import { useMediaQuery } from '../../controllers/useMediaQuery'
import WinDistributionChart from '../charts/WinDistributionChart'
import RulesDialog from '../game/RulesDialog'

function StatList({ items, testId }: { readonly items: readonly StatItem[]; readonly testId: string }) {
  return (
    <dl className="stat-list" data-testid={testId}>
      {items.map((s) => (
        <div key={s.id} data-testid={`stat-${s.id}`}>
          <dt>{s.label}</dt>
          <dd>
            <span className="stat-list__value">{s.value}</span>
            {s.detail && <span className="stat-list__detail">{s.detail}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * RTP breakdown as one ledger: the base total with its parts indented ("of which"),
 * the feature, then the grand total set apart below a rule.
 */
function Breakdown({ items }: { readonly items: readonly StatItem[] }) {
  return (
    <dl className="breakdown" data-testid="breakdown">
      {items.map((s) => (
        <div
          key={s.id}
          data-testid={`stat-${s.id}`}
          className={`breakdown__row${s.level === 1 ? ' breakdown__row--part' : ''}${s.total ? ' breakdown__row--total' : ''}`}
        >
          <dt>{s.label}</dt>
          <dd>
            <span className="breakdown__value">{s.value}</span>
            {s.detail && <span className="stat-list__detail">{s.detail}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Every figure on this page comes from RTP_REPORT_VIEW (reports/rtp-report.json). */
export default function MathFairness() {
  const r = RTP_REPORT_VIEW
  const narrow = useMediaQuery('(max-width: 600px)')
  const [rulesOpen, setRulesOpen] = useState(false)
  const closeRules = useCallback(() => setRulesOpen(false), [])

  return (
    <main className="page">
      <title>Math &amp; Fairness — Abyss Pearls</title>
      <h1>Math &amp; Fairness</h1>
      <p className="lede">
        What the game returns, how sure we are, and how to reproduce every number. All figures on this page are read
        from the simulation report the build ships with.
      </p>

      <section className="headline-rtp" aria-labelledby="headline-heading" data-testid="headline">
        <h2 id="headline-heading" className="sr-only">
          Headline RTP
        </h2>
        <p className="headline-rtp__value" data-testid="headline-rtp">
          {r.headline.text}
        </p>
        <p>{r.headline.methodSentence}</p>
        <p className="note">
          {r.headline.target}:{' '}
          <span className={r.headline.inBand ? 'status-ok' : 'status-bad'}>
            {r.headline.inBand ? 'inside the band' : 'outside the band'}
          </span>
          .
        </p>
        <p>
          <button type="button" className="button button--ghost" onClick={() => setRulesOpen(true)}>
            Open the rules &amp; paytable
          </button>
        </p>
      </section>

      <h2>RTP breakdown</h2>
      <Breakdown items={r.breakdown} />

      <h3>Feature by chest count</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <caption>Each trigger size is simulated on its own and weighted by its exact chance.</caption>
          <thead>
            <tr>
              <th scope="col">Chests</th>
              <th scope="col" className="num">
                Chance per spin
              </th>
              <th scope="col" className="num">
                Free spins
              </th>
              <th scope="col" className="num">
                Mean feature win (× bet)
              </th>
            </tr>
          </thead>
          <tbody>
            {r.strata.map((s) => (
              <tr key={s.chests}>
                <th scope="row">{s.chests}</th>
                <td className="num">{s.chance}</td>
                <td className="num">{s.freeSpins}</td>
                <td className="num">{s.meanWin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Independent check</h3>
      <p data-testid="independent-check">
        A separate plain simulation of {r.independentCheck.spins} full-game spins (different seed, nothing exact) gives{' '}
        <strong>{r.independentCheck.rtp}</strong> (95% CI {r.independentCheck.ciRange}). Against the headline,{' '}
        <strong>{r.independentCheck.zText}</strong>:{' '}
        <span className={r.independentCheck.consistent ? 'status-ok' : 'status-bad'}>{r.independentCheck.sentence}</span>
      </p>

      <h2>Key statistics</h2>
      <StatList items={r.keyStats} testId="key-stats" />

      <h2>Win distribution</h2>
      {r.distribution.map((panel) => (
        <WinDistributionChart key={panel.id} panel={panel} width={narrow ? 340 : 640} />
      ))}

      <h2>How it is computed</h2>
      <div className="prose">
        <ul>
          <li>
            <strong>Exact base game.</strong> Each reel stops independently, so the base game’s return is summed over
            every combination of reel stops, weighted by its probability: no sampling error.
          </li>
          <li>
            <strong>Stratified feature simulation.</strong> The free-spin feature depends on random wild multipliers and
            retriggers, so it is simulated. Each trigger size (number of chests) gets its own batch of features, and
            the results are weighted by the exact chance of that trigger. This gives a much tighter interval than
            waiting for features to occur naturally.
          </li>
          <li>
            <strong>Two RNGs, one interface.</strong> Simulations and tests use a seeded xoshiro128** generator so every
            run is reproducible; real play uses the browser’s <code>crypto.getRandomValues</code>. The game code cannot
            tell them apart.
          </li>
          <li>
            <strong>No modulo bias.</strong> Random integers are drawn by rejection sampling, so every reel stop is
            exactly equally likely.
          </li>
          <li>
            <strong>Integer money.</strong> Pays are whole coins and bets are whole ✦ Pearls; there is no floating-point
            rounding anywhere in a win.
          </li>
          <li>
            <strong>Settlement.</strong> Rounds settle at the moment Spin is pressed (server-style); the reels only
            reveal an outcome that already exists.
          </li>
        </ul>
      </div>

      <h2>Reproducibility</h2>
      <dl className="stat-list repro" data-testid="reproducibility">
        {r.reproducibility.map((s) => (
          <div key={s.id} data-testid={`repro-${s.id}`}>
            <dt>{s.label}</dt>
            <dd>
              <span className={s.hash ? 'hash' : 'repro__value'}>{s.value}</span>
              {s.detail && <span className="stat-list__detail">{s.detail}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p>Regenerate the report and compare the hashes:</p>
      <pre className="code-block">
        <code>{r.command}</code>
      </pre>
      <details>
        <summary>Rule files covered by the code hash</summary>
        <ul>
          {r.codeFiles.map((f) => (
            <li key={f}>
              <code>{f}</code>
            </li>
          ))}
        </ul>
      </details>

      <p className="note">
        RTP is a long-run average over millions of spins, not a promise for any session. This is a demo:{' '}
        <Link to="/play">play it</Link> with free ✦ Pearls.
      </p>

      <RulesDialog open={rulesOpen} betLevel={0} onClose={closeRules} />
    </main>
  )
}
