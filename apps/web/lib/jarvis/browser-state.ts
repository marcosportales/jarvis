import type { JarvisState } from "./session"

/**
 * The open Session's Jarvis State, which the Jarvis page hands over whenever
 * it changes, so an Expanded Widget covering the orb can still show it. One
 * per tab. Browser only.
 */
let shown: JarvisState = "idle"
const listeners = new Set<() => void>()

export const shownJarvisState = {
  get: () => shown,
  set(next: JarvisState) {
    if (next === shown) return
    shown = next
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
