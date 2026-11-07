import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createOrbInput, HOLD_THRESHOLD_MS } from "./orb-input"
import { setup } from "./session-fakes"

/** Lets time pass, settling whatever the Session does meanwhile. */
const wait = (ms = 0) => vi.advanceTimersByTimeAsync(ms)

function setupOrbInput() {
  const jarvis = setup()
  return { ...jarvis, orbInput: createOrbInput(jarvis.session) }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("Orb input", () => {
  it("turns Hands-free on with a tap and off with another", async () => {
    const { session, orbInput, listener } = setupOrbInput()

    orbInput.press("orb")
    await wait(HOLD_THRESHOLD_MS - 50)
    orbInput.release("orb")
    await wait()

    expect(session.getSnapshot().handsFree).toBe(true)
    expect(session.getSnapshot().state).toBe("idle")

    orbInput.press("space")
    await wait(100)
    orbInput.release("space")
    await wait()

    expect(session.getSnapshot().handsFree).toBe(false)
    expect(listener.calls).toEqual(["open", "close"])
  })

  it("makes a press held past the threshold Push-to-talk", async () => {
    const { session, orbInput, brain } = setupOrbInput()

    orbInput.press("space")
    await wait(HOLD_THRESHOLD_MS - 1)

    expect(session.getSnapshot().state).toBe("idle")

    await wait(1)

    expect(session.getSnapshot().state).toBe("listening")

    orbInput.release("space")
    await wait()

    expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
    expect(session.getSnapshot().handsFree).toBe(false)
  })

  it("keeps a hold with its source: releasing another ends nothing", async () => {
    const { session, orbInput } = setupOrbInput()

    orbInput.press("space")
    await wait(HOLD_THRESHOLD_MS)
    orbInput.press("orb")
    orbInput.release("orb")
    await wait(HOLD_THRESHOLD_MS)

    expect(session.getSnapshot().state).toBe("listening")
    expect(session.getSnapshot().handsFree).toBe(false)
  })

  it("ignores a second source's press while one is still undecided", async () => {
    const { session, orbInput } = setupOrbInput()

    orbInput.press("space")
    orbInput.press("orb")
    orbInput.release("orb")
    await wait(HOLD_THRESHOLD_MS)

    expect(session.getSnapshot().state).toBe("listening")
  })

  it("ends a page hold when the page loses focus", async () => {
    const { session, orbInput, brain } = setupOrbInput()

    orbInput.press("orb")
    await wait(HOLD_THRESHOLD_MS)
    orbInput.windowBlurred()
    await wait()

    expect(session.getSnapshot().state).not.toBe("listening")
    expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
  })

  it("drops an undecided press when the page loses focus: no tap, no hold", async () => {
    const { session, orbInput, listener } = setupOrbInput()

    orbInput.press("space")
    await wait(100)
    orbInput.windowBlurred()
    await wait(HOLD_THRESHOLD_MS)
    orbInput.release("space")
    await wait()

    expect(session.getSnapshot().handsFree).toBe(false)
    expect(session.getSnapshot().state).toBe("idle")
    expect(listener.calls).toEqual([])
  })

  it("holds at once for the Jarvis App, which tells a hold itself", async () => {
    const { session, orbInput } = setupOrbInput()

    orbInput.press("jarvis-app")
    await wait()

    expect(session.getSnapshot().state).toBe("listening")
  })
})
