/** Native-pixel layout from the artist's src/assets/ui/layout.json. Multiply by scale. */
import layout from '../../assets/ui/layout.json'

export const LAYOUT = layout

/**
 * Largest display scale (2 = 96 px cells, the desktop look). Below it, the reels pick
 * the largest scale that keeps whole device pixels per art pixel (controllers/pixelScale.ts).
 */
export const DESKTOP_SCALE = layout.scale

/** The Spin button is always 96 CSS px (integer scale 2): large and thumb-reachable on phones. */
export const SPIN_BUTTON_SCALE = 2
