import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { FloatingOrbGesture, JarvisAppApi } from "./app-bridge"
import { createFloatingOrb, HOLD_THRESHOLD_MS } from "./floating-orb"
import type { JarvisState } from "./session"

/** The Jarvis App's preload API, as the Floating Orb page sees it. */
function fakeJarvisApp() {
  const listeners = new Set<(state: JarvisState) => void>()
  let latest: JarvisState | undefined
  const sent: FloatingOrbGesture[] = []
  const app: Pick<JarvisAppApi, "onJarvisState" | "sendFloatingOrbGesture"> = {
    onJarvisState(listener) {
      listeners.add(listener)
      if (latest) listener(latest)
      return () => listeners.delete(listener)
    },
    sendFloatingOrbGesture: (gesture) => sent.push(gesture),
  }
  return {
    app,
    /** What the Floating Orb told the Jarvis App, in order. */
    sent,
    /** The Jarvis App relays the Jarvis page's state. */
    relay(state: JarvisState) {
      latest = state
      for (const listener of listeners) listener(state)
    },
    get following() {
      return listeners.size > 0
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("The Floating Orb page", () => {
  it("shows each Jarvis State it receives", () => {
    const jarvisApp = fakeJarvisApp()
    const orb = createFloatingOrb(jarvisApp.app)
    const shown: JarvisState[] = []
    orb.subscribe(() => shown.push(orb.getState()))

    for (const state of [
      "listening",
      "thinking",
      "speaking",
      "idle",
    ] as const) {
      jarvisApp.relay(state)
    }

    expect(shown).toEqual(["listening", "thinking", "speaking", "idle"])
  })

  it("is Idle until it hears otherwise", () => {
    const orb = createFloatingOrb(fakeJarvisApp().app)

    expect(orb.getState()).toBe("idle")
  })

  it("shows the Jarvis State relayed before it listened", () => {
    const jarvisApp = fakeJarvisApp()
    jarvisApp.relay("speaking")
    const orb = createFloatingOrb(jarvisApp.app)

    orb.subscribe(() => {})

    expect(orb.getState()).toBe("speaking")
  })

  it("stops following the Jarvis State once nothing shows it", () => {
    const jarvisApp = fakeJarvisApp()
    const orb = createFloatingOrb(jarvisApp.app)

    const unsubscribe = orb.subscribe(() => {})
    expect(jarvisApp.following).toBe(true)
    unsubscribe()

    expect(jarvisApp.following).toBe(false)
  })

  it("makes a hold beyond the threshold a Push-to-talk press, then release", () => {
    const jarvisApp = fakeJarvisApp()
    const orb = createFloatingOrb(jarvisApp.app)

    orb.pointerDown()
    vi.advanceTimersByTime(HOLD_THRESHOLD_MS - 1)
    expect(jarvisApp.sent).toEqual([])
    vi.advanceTimersByTime(1)
    expect(jarvisApp.sent).toEqual(["press"])

    vi.advanceTimersByTime(2_000)
    orb.pointerUp()

    expect(jarvisApp.sent).toEqual(["press", "release"])
  })

  it("makes a release before the threshold a click, with no Push-to-talk", () => {
    const jarvisApp = fakeJarvisApp()
    const orb = createFloatingOrb(jarvisApp.app)

    orb.pointerDown()
    vi.advanceTimersByTime(HOLD_THRESHOLD_MS - 1)
    orb.pointerUp()
    vi.advanceTimersByTime(HOLD_THRESHOLD_MS)

    expect(jarvisApp.sent).toEqual(["click"])
  })

  it("ends a hold when the pointer is lost, and drops a cut-short click", () => {
    const jarvisApp = fakeJarvisApp()
    const orb = createFloatingOrb(jarvisApp.app)

    orb.pointerDown()
    vi.advanceTimersByTime(HOLD_THRESHOLD_MS)
    orb.pointerCancel()
    orb.pointerDown()
    orb.pointerCancel()
    vi.advanceTimersByTime(HOLD_THRESHOLD_MS)

    expect(jarvisApp.sent).toEqual(["press", "release"])
  })

  it("ignores a release with no press before it", () => {
    const jarvisApp = fakeJarvisApp()
    const orb = createFloatingOrb(jarvisApp.app)

    orb.pointerUp()
    orb.pointerCancel()

    expect(jarvisApp.sent).toEqual([])
  })

  it("does nothing outside the Jarvis App", () => {
    const orb = createFloatingOrb(undefined)

    const unsubscribe = orb.subscribe(() => {})
    orb.pointerDown()
    vi.advanceTimersByTime(HOLD_THRESHOLD_MS)
    orb.pointerUp()
    unsubscribe()

    expect(orb.getState()).toBe("idle")
  })
})
