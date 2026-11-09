/**
 * The player's sound preference (muted or not), persisted in localStorage. Storage can
 * be blocked (private mode, quota): every access is wrapped and falls back to "sound
 * on". Sound itself only starts after the first user gesture (browser autoplay rules);
 * that part lives with the AudioContext in src/views/audio/SoundDirector.tsx.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export const SOUND_STORAGE_KEY = 'abyss-pearls:sound:v1'

export function loadMuted(storage: Storage | undefined = safeLocalStorage()): boolean {
  try {
    const text = storage?.getItem(SOUND_STORAGE_KEY)
    if (!text) return false
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null && (parsed as { muted?: unknown }).muted === true
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean, storage: Storage | undefined = safeLocalStorage()): void {
  try {
    storage?.setItem(SOUND_STORAGE_KEY, JSON.stringify({ muted }))
  } catch {
    // Not persisted; the toggle still works for this page view.
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export interface SoundSettings {
  readonly muted: boolean
  toggleMuted(): void
}

export function useSoundSettings(): SoundSettings {
  const [muted, setMuted] = useState(() => loadMuted())
  const changed = useRef(false)
  useEffect(() => {
    // Only write once the player has actually toggled (no write on page load).
    if (changed.current) saveMuted(muted)
  }, [muted])
  const toggleMuted = useCallback(() => {
    changed.current = true
    setMuted((m) => !m)
  }, [])
  return { muted, toggleMuted }
}
