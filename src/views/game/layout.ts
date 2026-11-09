/** Native-pixel layout from the artist's src/assets/ui/layout.json. Multiply by scale. */
import layout from '../../assets/ui/layout.json'

export const LAYOUT = layout

/** Integer display scales: 2 on desktop (96px cells), 1 on narrow screens. */
export const DESKTOP_SCALE = layout.scale
export const NARROW_SCALE = 1
