import { createBrowserRouter } from 'react-router'
import { PlayLayout, SiteLayout } from './views/layout/SiteLayout.tsx'
import Home from './views/pages/Home.tsx'
import Play from './views/pages/Play.tsx'
import MathFairness from './views/pages/MathFairness.tsx'
import Architecture from './views/pages/Architecture.tsx'
import Contact from './views/pages/Contact.tsx'

/** The whole site map in one place (React Router v7, data mode). */
export const router = createBrowserRouter([
  {
    Component: SiteLayout,
    children: [
      { path: '/', Component: Home },
      { path: '/math', Component: MathFairness },
      { path: '/architecture', Component: Architecture },
      { path: '/contact', Component: Contact },
    ],
  },
  {
    // The game keeps a compact nav so the machine stays the focus.
    Component: PlayLayout,
    children: [{ path: '/play', Component: Play }],
  },
])
