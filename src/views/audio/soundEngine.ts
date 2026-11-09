/**
 * Owns the AudioContext. Browser autoplay rules: the context is created (and resumed)
 * only inside a user gesture (`unlock`), never on page load. Before that, cues are
 * dropped silently. With no WebAudio support every method is a no-op, and any audio
 * error is swallowed: sound must never break the game.
 */
import type { SoundCue } from '../../controllers/soundCues'
import { playCue } from './cueSounds'

/** Overall loudness: short, tasteful, quiet. */
export const MASTER_GAIN = 0.3

/** Spacing between cues of one batch that would otherwise sound at once (slam stop). */
const BATCH_SPACING_S = 0.03

type AudioContextCtor = new () => AudioContext

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

export interface SoundEngine {
  /** Call from a user gesture: creates or resumes the AudioContext. */
  unlock(): void
  setMuted(muted: boolean): void
  play(cues: readonly SoundCue[]): void
  close(): void
}

export function createSoundEngine(initiallyMuted: boolean): SoundEngine {
  const Ctor = audioContextCtor()
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let muted = initiallyMuted

  return {
    unlock() {
      if (!Ctor) return
      try {
        if (!ctx) {
          ctx = new Ctor()
          master = ctx.createGain()
          master.gain.value = muted ? 0 : MASTER_GAIN
          master.connect(ctx.destination)
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      } catch {
        ctx = null
        master = null
      }
    },

    setMuted(next) {
      muted = next
      if (!ctx || !master) return
      try {
        master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime, 0.02)
      } catch {
        // ignore
      }
    },

    play(cues) {
      if (!ctx || !master || muted || ctx.state === 'closed') return
      const voice = { ctx, out: master }
      let reelStops = 0
      cues.forEach((cue) => {
        try {
          // A slam stop lands every reel in one batch: ripple them instead of one loud hit.
          const offset = cue.kind === 'reelStop' ? reelStops++ * BATCH_SPACING_S : 0
          playCue(voice, cue, offset)
        } catch {
          // A failed voice is skipped; the game goes on.
        }
      })
    },

    close() {
      const c = ctx
      ctx = null
      master = null
      c?.close().catch(() => {})
    },
  }
}
