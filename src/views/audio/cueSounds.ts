/**
 * What each presentation cue sounds like. Short, soft and original: a deep-sea palette
 * of muted thunks, bubbles and bell tones built from synth.ts primitives.
 */
import type { SoundCue } from '../../controllers/soundCues'
import { hz, noise, tone, type Voice } from './synth'

/** C major pentatonic from C5 (MIDI 72): bright but never harsh. */
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93]

function arpeggio(v: Voice, notes: readonly number[], step: number, spec: { type: OscillatorType; dur: number; gain: number; at?: number }) {
  notes.forEach((n, i) => tone(v, { freq: hz(n), type: spec.type, dur: spec.dur, gain: spec.gain, at: (spec.at ?? 0) + i * step }))
}

function bell(v: Voice, freq: number, at: number, gain: number, dur = 0.6) {
  tone(v, { freq, at, dur, gain, attack: 0.004 })
  tone(v, { freq: freq * 2.01, at, dur: dur * 0.6, gain: gain * 0.35, attack: 0.004 })
}

/** Play one cue. `offset` (s) spaces several cues from one batch (e.g. a slam stop). */
export function playCue(v: Voice, cue: SoundCue, offset = 0): void {
  const at = offset
  switch (cue.kind) {
    case 'click':
      tone(v, { freq: 1300, type: 'square', dur: 0.03, gain: 0.06, at })
      return

    case 'spinStart':
      // A soft swirl of water, rising.
      noise(v, { filter: 'bandpass', freq: 350, freqEnd: cue.free ? 2600 : 1600, q: 2.5, dur: 0.32, gain: 0.32, attack: 0.04, at })
      tone(v, { freq: 196, freqEnd: cue.free ? 392 : 294, type: 'triangle', dur: 0.16, gain: 0.18, at })
      return

    case 'reelStop': {
      // A muffled thunk, a little higher on each reel.
      const f = 150 + cue.reel * 22
      tone(v, { freq: f, freqEnd: f * 0.55, type: 'triangle', dur: 0.11, gain: cue.slam ? 0.32 : 0.45, at })
      noise(v, { filter: 'lowpass', freq: 900, dur: 0.045, gain: 0.18, at })
      return
    }

    case 'scatterLand': {
      // A bubbling bell that climbs with each chest.
      const f = hz(76 + Math.min(cue.chests - 1, 4) * 3)
      bell(v, f, at, 0.26)
      tone(v, { freq: f / 2, freqEnd: f, type: 'sine', dur: 0.12, gain: 0.12, at })
      return
    }

    case 'anticipation':
      // A slow rising shimmer while the remaining reels tease.
      tone(v, { freq: 220, freqEnd: 440, type: 'sine', dur: 1.1, gain: 0.1, attack: 0.3, at })
      tone(v, { freq: 223, freqEnd: 446, type: 'triangle', dur: 1.1, gain: 0.06, attack: 0.3, at })
      return

    case 'win':
      // Count-up ticks.
      if (cue.tier === 'small') arpeggio(v, [PENTA[0], PENTA[2], PENTA[4]], 0.08, { type: 'square', dur: 0.06, gain: 0.05, at })
      else arpeggio(v, PENTA.slice(0, 7), 0.07, { type: 'square', dur: 0.07, gain: 0.05, at })
      return

    case 'bigWin':
      arpeggio(v, [60, 64, 67, 72, 76, 79, 84], 0.085, { type: 'triangle', dur: 0.22, gain: 0.2, at })
      for (const n of [72, 76, 79]) tone(v, { freq: hz(n), type: 'sine', dur: 1.6, gain: 0.1, attack: 0.05, at: at + 0.65 })
      noise(v, { filter: 'highpass', freq: 5000, dur: 1.2, gain: 0.05, attack: 0.2, at: at + 0.6 })
      return

    case 'retrigger':
      bell(v, hz(84), at, 0.22, 0.4)
      bell(v, hz(91), at + 0.12, 0.22, 0.6)
      return

    case 'featureIntro':
      tone(v, { freq: 55, freqEnd: 110, type: 'sine', dur: 1.6, gain: 0.22, attack: 0.2, at })
      arpeggio(v, PENTA.slice(0, 8), 0.1, { type: 'triangle', dur: 0.25, gain: 0.14, at: at + 0.15 })
      noise(v, { filter: 'bandpass', freq: 300, freqEnd: 3000, q: 1.5, dur: 1.2, gain: 0.1, attack: 0.4, at })
      return

    case 'featureOutro':
      for (const n of [67, 71, 74]) tone(v, { freq: hz(n), type: 'triangle', dur: 0.5, gain: 0.1, at })
      for (const n of [60, 64, 67, 72]) tone(v, { freq: hz(n), type: 'triangle', dur: 1.4, gain: 0.1, attack: 0.02, at: at + 0.45 })
      return
  }
}
