import { Link } from 'react-router'
import type { SymbolFace } from '../../controllers/reelPresentation'
import { RTP_REPORT_VIEW } from '../../controllers/rtpReportView'
import { useMediaQuery } from '../../controllers/useMediaQuery'
import background from '../../assets/bg/background.png'
import StaticReels from '../game/StaticReels'

/** Hero art: a still composition of the real symbols (presentation only, not an outcome). */
const HERO_FACES: readonly (readonly SymbolFace[])[] = [
  ['WHALE_TOP', 'WHALE_MID', 'WHALE_BOTTOM'],
  ['SHARK', 'WILD', 'PEARL'],
  ['OCTOPUS', 'WHALE_TOP', 'WHALE_BOTTOM'],
  ['CHEST', 'TURTLE', 'WILD'],
  ['ANGLER', 'SHELL', 'STARFISH'],
]

export default function Home() {
  const narrow = useMediaQuery('(max-width: 600px)')
  const rtp = RTP_REPORT_VIEW
  return (
    <main className="page home">
      <title>Abyss Pearls — original deep-sea video slot</title>
      <section className="hero" style={{ backgroundImage: `url(${background})` }} aria-labelledby="home-title">
        <div className="hero__text">
          <h1 id="home-title">Abyss Pearls</h1>
          <p className="lede">
            An original deep-sea, 243-ways video slot with a stacked whale and free spins where every wild carries a
            multiplier.
          </p>
          <div className="hero__actions">
            <Link to="/play" className="button">
              Play Demo
            </Link>
            <Link to="/math" className="button button--ghost">
              See the math
            </Link>
          </div>
        </div>
        <StaticReels
          faces={HERO_FACES}
          scale={narrow ? 1 : 2}
          label="Pixel-art reels: a stacked whale, shark, octopus, Kraken Eye wilds, a treasure chest and sea creatures."
        />
      </section>

      <h2>Highlights</h2>
      <ul className="card-grid" aria-label="Highlights">
        <li className="card" data-testid="card-rtp">
          <h3>Theoretical RTP</h3>
          <p className="card__figure">{rtp.headline.rtp}</p>
          <p>
            95% CI {rtp.headline.ciRange}. {rtp.volatility.label} volatility (σ {rtp.volatility.sigma} per spin).
          </p>
        </li>
        <li className="card">
          <h3>Verified math</h3>
          <p>
            Base game computed exactly over every reel stop; the feature by a seeded, stratified simulation, checked
            against an independent full-game run. Every figure on the site is read from the generated report.
          </p>
        </li>
        <li className="card">
          <h3>MVC, RGS-ready</h3>
          <p>
            Pure TypeScript math model, a reducer-driven spin state machine and display-only React views. Layer rules
            are enforced by the linter, and one result type is the seam for a remote game server.
          </p>
        </li>
        <li className="card">
          <h3>Original art pipeline</h3>
          <p>
            Every sprite is drawn by deterministic Python generators from one in-house palette, with a palette check, so
            the whole set rebuilds byte-for-byte and reskins from one file.
          </p>
        </li>
      </ul>

      <h2>What you are looking at</h2>
      <div className="prose">
        <p>
          A complete, playable slot built as a portfolio piece for studios and licensed operators. It runs in the
          browser on virtual ✦ Pearls only; there is no real-money path of any kind.
        </p>
        <ul>
          <li>
            <strong>Game:</strong> 5 × 3 reels, 243 ways, stacked whale hero symbol, Kraken Eye wilds and Treasure
            Chest scatters that start the Abyss Dive free spins. <Link to="/play">Play it</Link>.
          </li>
          <li>
            <strong>Math &amp; fairness:</strong> theoretical RTP with a confidence interval, volatility, hit rate, win
            distribution and reproducibility hashes. <Link to="/math">Read the report</Link>.
          </li>
          <li>
            <strong>Engineering:</strong> how the outcome is settled before the reels move, and where a server plugs
            in. <Link to="/architecture">See the architecture</Link>.
          </li>
        </ul>
      </div>
    </main>
  )
}
