/**
 * Crisp pixel art at any width: pick the display scale so every art pixel covers a
 * whole number of DEVICE pixels (DECISIONS 2026-11-09: integer scale, pixelated).
 *
 *   devicePxPerArtPx k = the largest integer with  artWidth × k / dpr ≤ available CSS px
 *   cssScale           = k / dpr     (CSS px per art pixel, may be fractional)
 *
 * On a DPR 1 screen this is simply an integer CSS scale. On a DPR 3 phone, k = 4 gives
 * 4/3 CSS px per art pixel: 64 CSS px cells, still exactly 4 × 4 device pixels per art
 * pixel. Pure; the hook below only measures the space and the device pixel ratio.
 */
import { useLayoutEffect, useState, type RefObject } from 'react'

export interface PixelScaleInput {
  /** Width available for the art, in CSS px. */
  readonly availableCssPx: number
  /** Width of the art in art pixels (e.g. the 260 px reel frame). */
  readonly artWidth: number
  readonly devicePixelRatio: number
  /** Never larger than this many CSS px per art pixel (keeps the desktop look). */
  readonly maxCssScale: number
}

export interface PixelScale {
  /** Device pixels per art pixel: always a whole number ≥ 1. */
  readonly devicePxPerArtPx: number
  /** CSS px per art pixel (devicePxPerArtPx / dpr). */
  readonly cssScale: number
}

/** Tolerance for float noise, e.g. 390 × 2 / 260 = 2.9999999. */
const EPS = 1e-6

export function sanitizeDpr(dpr: number): number {
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1
}

export function choosePixelScale(input: PixelScaleInput): PixelScale {
  const dpr = sanitizeDpr(input.devicePixelRatio)
  const fit = Math.floor((Math.max(0, input.availableCssPx) * dpr) / input.artWidth + EPS)
  const cap = Math.max(1, Math.floor(input.maxCssScale * dpr + EPS))
  const k = Math.max(1, Math.min(fit, cap))
  return { devicePxPerArtPx: k, cssScale: k / dpr }
}

function currentDpr(): number {
  return typeof window === 'undefined' ? 1 : sanitizeDpr(window.devicePixelRatio)
}

/**
 * Measure the content width of `ref` (ResizeObserver) and the device pixel ratio
 * (re-checked on resize and when the page moves to a screen with another DPR), and
 * return the scale for art `artWidth` px wide. `reservePx` is subtracted first (e.g.
 * room for a Spin button beside the reels).
 */
export function usePixelScale(
  ref: RefObject<HTMLElement | null>,
  artWidth: number,
  maxCssScale: number,
  reservePx = 0,
): PixelScale {
  const [space, setSpace] = useState(() => ({
    width: typeof window === 'undefined' ? artWidth * maxCssScale : window.innerWidth,
    dpr: currentDpr(),
  }))

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    const measure = () => {
      const style = window.getComputedStyle(el)
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const width = el.clientWidth - (Number.isFinite(padding) ? padding : 0)
      const dpr = currentDpr()
      setSpace((s) => (s.width === width && s.dpr === dpr ? s : { width, dpr }))
    }
    measure()

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(el)
    window.addEventListener('resize', measure)

    // A DPR change (browser zoom, moving to another monitor) fires this media query once.
    let mql: MediaQueryList | null = null
    const watchDpr = () => {
      mql?.removeEventListener('change', onDprChange)
      mql = window.matchMedia?.(`(resolution: ${currentDpr()}dppx)`) ?? null
      mql?.addEventListener('change', onDprChange)
    }
    const onDprChange = () => {
      measure()
      watchDpr()
    }
    watchDpr()

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      mql?.removeEventListener('change', onDprChange)
    }
  }, [ref])

  return choosePixelScale({
    availableCssPx: space.width - reservePx,
    artWidth,
    devicePixelRatio: space.dpr,
    maxCssScale,
  })
}
