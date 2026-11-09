import { Link } from 'react-router'

export default function Home() {
  return (
    <main>
      <h1>Abyss Pearls</h1>
      <p>A deep-sea slot demo. Virtual ✦ Pearls only.</p>
      <nav aria-label="Site">
        <ul>
          <li><Link to="/play">Play</Link></li>
          <li><Link to="/math">Math &amp; Fairness</Link></li>
          <li><Link to="/architecture">Architecture</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
      </nav>
    </main>
  )
}
