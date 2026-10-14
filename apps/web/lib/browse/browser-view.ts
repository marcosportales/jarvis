import type { BrowseView } from "./view"

/** What the Browser Widget shows, and how it stops the Browse Task. */
export type ShownBrowse = {
  view: BrowseView | null
  /** The page saw it end: the Widget highlights it. */
  justEnded: boolean
  /** Resolves to whether it stopped. */
  stop(): Promise<boolean>
}

/**
 * The open Session's Browse Task, which the Jarvis page hands over whenever
 * it changes. One per tab. Browser only.
 */
let shown: ShownBrowse | null = null
const listeners = new Set<() => void>()

export const shownBrowse = {
  get: () => shown,
  set(next: ShownBrowse | null) {
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
