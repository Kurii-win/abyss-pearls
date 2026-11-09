import { useEffect, useRef } from 'react'
import type { SoundCueListener } from '../../controllers/useSlotMachine'
import { createSoundEngine, type SoundEngine } from './soundEngine'

interface SoundDirectorProps {
  /** The controller's cue stream (useSlotMachine().subscribeCues). */
  readonly subscribe: (listener: SoundCueListener) => () => void
  readonly muted: boolean
}

/** Gestures that count as user activation for audio in current browsers. */
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const

/**
 * Plays the controller's sound cues. Renders nothing. The AudioContext is only created
 * on the first user gesture (listened for in the capture phase, so it exists before the
 * Spin click or Space press it came from is handled).
 */
export default function SoundDirector({ subscribe, muted }: SoundDirectorProps) {
  const engineRef = useRef<SoundEngine | null>(null)
  const mutedRef = useRef(muted)

  useEffect(() => {
    const engine = createSoundEngine(mutedRef.current)
    engineRef.current = engine
    const unlock = () => engine.unlock()
    for (const g of GESTURES) window.addEventListener(g, unlock, true)
    return () => {
      for (const g of GESTURES) window.removeEventListener(g, unlock, true)
      engine.close()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    const wasMuted = mutedRef.current
    mutedRef.current = muted
    engineRef.current?.setMuted(muted)
    // Turning sound back on confirms itself with a click.
    if (wasMuted && !muted) engineRef.current?.play([{ kind: 'click' }])
  }, [muted])

  useEffect(() => subscribe((cues) => engineRef.current?.play(cues)), [subscribe])

  return null
}
