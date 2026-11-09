import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import pearl from '../../assets/symbols/pearl.png'
import './site.css'

const DEMO_FOOTER = 'Demo — ✦ Pearls have no monetary value and cannot be purchased or redeemed.'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/play', label: 'Play', end: false },
  { to: '/math', label: 'Math & Fairness', end: false },
  { to: '/architecture', label: 'Architecture', end: false },
  { to: '/contact', label: 'Contact', end: false },
] as const

function SiteNav({ compact }: { readonly compact: boolean }) {
  return (
    <header className={`site-header${compact ? ' site-header--compact' : ''}`}>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <div className="site-header__inner">
        <Link to="/" className="brand">
          {!compact && <img src={pearl} alt="" width={48} height={48} className="pixel" />}
          <span>Abyss Pearls</span>
        </Link>
        <nav aria-label="Site">
          <ul className="site-nav">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer__demo">{DEMO_FOOTER}</p>
      <p>Original game, math and pixel art. Runs entirely in your browser.</p>
    </footer>
  )
}

/** Portfolio pages: full header nav and footer. */
export function SiteLayout() {
  return (
    <div className="site">
      <SiteNav compact={false} />
      <div id="content" tabIndex={-1} className="site__content">
        <Outlet />
      </div>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}

/** The game: a compact nav so the machine stays the focus. */
export function PlayLayout() {
  return (
    <div className="site site--play">
      <SiteNav compact />
      <div id="content" tabIndex={-1} className="site__content">
        <Outlet />
      </div>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
