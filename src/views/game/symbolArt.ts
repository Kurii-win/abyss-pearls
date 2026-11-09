/** SymbolFace → generated pixel-art PNG (src/assets, made by tools/art/). */
import type { SymbolFace } from '../../controllers/reelPresentation'
import anchor from '../../assets/symbols/anchor.png'
import angler from '../../assets/symbols/angler.png'
import badgeX2 from '../../assets/symbols/badge_x2.png'
import badgeX3 from '../../assets/symbols/badge_x3.png'
import chest from '../../assets/symbols/chest.png'
import octopus from '../../assets/symbols/octopus.png'
import pearl from '../../assets/symbols/pearl.png'
import shark from '../../assets/symbols/shark.png'
import shell from '../../assets/symbols/shell.png'
import starfish from '../../assets/symbols/starfish.png'
import turtle from '../../assets/symbols/turtle.png'
import whaleBottom from '../../assets/symbols/whale_bottom.png'
import whaleMid from '../../assets/symbols/whale_mid.png'
import whaleSingle from '../../assets/symbols/whale_single.png'
import whaleTop from '../../assets/symbols/whale_top.png'
import wild from '../../assets/symbols/wild.png'

export const SYMBOL_ART: Readonly<Record<SymbolFace, string>> = {
  WHALE_TOP: whaleTop,
  WHALE_MID: whaleMid,
  WHALE_BOTTOM: whaleBottom,
  WHALE_SINGLE: whaleSingle,
  SHARK: shark,
  OCTOPUS: octopus,
  TURTLE: turtle,
  ANGLER: angler,
  PEARL: pearl,
  SHELL: shell,
  STARFISH: starfish,
  ANCHOR: anchor,
  WILD: wild,
  CHEST: chest,
}

/** Wild multiplier badge overlays (free spins). */
export const BADGE_ART: Readonly<Record<number, string>> = { 2: badgeX2, 3: badgeX3 }
