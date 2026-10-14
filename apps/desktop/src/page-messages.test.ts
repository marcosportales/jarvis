import { describe, expect, it } from "vitest"

import { parseFloatingOrbGesture, parseJarvisState } from "./page-messages.js"

describe("Messages from Jarvis's pages", () => {
  it("accepts the four Jarvis States, and nothing else", () => {
    for (const state of ["idle", "listening", "thinking", "speaking"]) {
      expect(parseJarvisState(state)).toBe(state)
    }
    for (const junk of ["asleep", "", undefined, null, 3, { state: "idle" }]) {
      expect(parseJarvisState(junk)).toBeUndefined()
    }
  })

  it("accepts the Floating Orb's hold, release and click, and nothing else", () => {
    for (const gesture of ["press", "release", "click"]) {
      expect(parseFloatingOrbGesture(gesture)).toBe(gesture)
    }
    for (const junk of ["drag", "", undefined, null, ["click"]]) {
      expect(parseFloatingOrbGesture(junk)).toBeUndefined()
    }
  })
})
