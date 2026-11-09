/** Subscribe to a CSS media query (e.g. prefers-reduced-motion). SSR/test safe. */
import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  const getSnapshot = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
