import type { FloatingOrbGesture, JarvisAppApi } from "./app-bridge"
import type { JarvisState } from "./session"

/**
 * How long the Owner must hold the Floating Orb for it to be Push-to-talk;
 * a shorter press is a click, which brings up the Jarvis window.
 */
export const HOLD_THRESHOLD_MS = 250

export type FloatingOrb = ReturnType<typeof createFloatingOrb>

/**
 * The Floating Orb page's logic. It has no Session of its own: it shows the
 * Jarvis State the Jarvis App relays from the Jarvis page, and tells the
 * Jarvis App what the Owner does with the mouse, a hold beyond
 * `HOLD_THRESHOLD_MS` being Push-to-talk and anything shorter a click.
 * Outside the Jarvis App (`app` missing) it stays Idle and does nothing.
 */
export function createFloatingOrb(
  app:
    Pick<JarvisAppApi, "onJarvisState" | "sendFloatingOrbGesture"> | undefined,
  { holdThresholdMs = HOLD_THRESHOLD_MS } = {}
) {
  let state: JarvisState = "idle"
  const listeners = new Set<() => void>()
  let stopFollowing: (() => void) | undefined

  /** Set while the pointer is down but not yet held long enough. */
  let holdTimer: ReturnType<typeof setTimeout> | undefined
  /** Whether a hold has become Push-to-talk. */
  let holding = false

  function send(gesture: FloatingOrbGesture) {
    app?.sendFloatingOrbGesture(gesture)
  }

  /** Ends the pointer's press; whether it was a hold or a click. */
  function endPress(): "hold" | "click" | undefined {
    if (holding) {
      holding = false
      return "hold"
    }
    if (holdTimer === undefined) return undefined
    clearTimeout(holdTimer)
    holdTimer = undefined
    return "click"
  }

  return {
    getState: () => state,

    /** For `useSyncExternalStore`; follows the Jarvis State while subscribed. */
    subscribe(listener: () => void) {
      listeners.add(listener)
      stopFollowing ??= app?.onJarvisState((next) => {
        if (next === state) return
        state = next
        for (const notify of listeners) notify()
      })
      return () => {
        listeners.delete(listener)
        if (listeners.size > 0) return
        stopFollowing?.()
        stopFollowing = undefined
      }
    },

    pointerDown() {
      if (holding || holdTimer !== undefined) return
      holdTimer = setTimeout(() => {
        holdTimer = undefined
        holding = true
        send("press")
      }, holdThresholdMs)
    },

    pointerUp() {
      const press = endPress()
      if (press === "hold") send("release")
      else if (press === "click") send("click")
    },

    /** The pointer was lost (e.g. taken by the system): no click, a hold ends. */
    pointerCancel() {
      if (endPress() === "hold") send("release")
    },
  }
}
