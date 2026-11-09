import { createBrowserRouter } from 'react-router'
import Home from './views/pages/Home.tsx'
import Play from './views/pages/Play.tsx'
import MathFairness from './views/pages/MathFairness.tsx'
import Architecture from './views/pages/Architecture.tsx'
import Contact from './views/pages/Contact.tsx'

/** The whole site map in one place (React Router v7, data mode). */
export const router = createBrowserRouter([
  { path: '/', Component: Home },
  { path: '/play', Component: Play },
  { path: '/math', Component: MathFairness },
  { path: '/architecture', Component: Architecture },
  { path: '/contact', Component: Contact },
])
