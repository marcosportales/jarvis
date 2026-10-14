import type { SearchOutcome } from "./outcome"

/**
 * What the Results Widget shows: the open Session's latest Search Outcome,
 * which the Jarvis page hands over whenever it changes. One per tab, in
 * memory only, so a reload starts empty. Browser only.
 */
let shown: SearchOutcome | null = null
const listeners = new Set<() => void>()

export const shownResults = {
  get: () => shown,
  set(outcome: SearchOutcome | null) {
    if (outcome === shown) return
    shown = outcome
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
