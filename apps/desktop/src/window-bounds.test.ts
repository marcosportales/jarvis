import { describe, expect, it } from "vitest"

import { DEFAULT_SIZE, restoreBounds } from "./window-bounds.js"

const SCREEN = { x: 0, y: 0, width: 2560, height: 1440 }

describe("Restoring the Jarvis window's size and place", () => {
  it("puts it back where the Owner left it", () => {
    const saved = JSON.stringify({ x: 100, y: 80, width: 1200, height: 900 })

    expect(restoreBounds(saved, [SCREEN])).toEqual({
      x: 100,
      y: 80,
      width: 1200,
      height: 900,
    })
  })

  it("keeps the size but lets the desktop place it when that place is off every screen", () => {
    const saved = JSON.stringify({ x: 4000, y: 80, width: 1200, height: 900 })

    expect(restoreBounds(saved, [SCREEN])).toEqual({
      width: 1200,
      height: 900,
    })
  })

  it("starts at the default size with nothing saved, or nothing usable", () => {
    expect(restoreBounds(undefined, [SCREEN])).toEqual(DEFAULT_SIZE)
    expect(restoreBounds("not json", [SCREEN])).toEqual(DEFAULT_SIZE)
    expect(restoreBounds(JSON.stringify({ width: "big" }), [SCREEN])).toEqual(
      DEFAULT_SIZE
    )
    expect(
      restoreBounds(JSON.stringify({ width: 10, height: 10 }), [SCREEN])
    ).toEqual(DEFAULT_SIZE)
  })
})
