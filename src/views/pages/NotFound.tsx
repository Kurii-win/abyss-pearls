import { Link, useLocation } from 'react-router'

/** Catch-all route inside the site layout: a friendly 404 instead of a router error. */
export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <main className="page" data-testid="not-found">
      <title>Page not found — Abyss Pearls</title>
      <h1>Page not found</h1>
      <p className="lede">
        Nothing lives at <code>{pathname}</code>, not even down here in the deep.
      </p>
      <p>
        <Link to="/">Back to the home page</Link> or <Link to="/play">play the demo</Link>.
      </p>
    </main>
  )
}
