import { describe, expect, it } from "vitest"

import { grantsPermission } from "./permissions.js"

const ORIGIN = "http://localhost:3000"

describe("Which pages get the microphone", () => {
  it("grants it to Jarvis's own pages", () => {
    expect(
      grantsPermission(ORIGIN, {
        permission: "media",
        url: `${ORIGIN}/sessions/42`,
        mediaTypes: ["audio"],
      })
    ).toBe(true)
  })

  it("grants it when asked only whether it's allowed, without media types", () => {
    expect(grantsPermission(ORIGIN, { permission: "media", url: ORIGIN })).toBe(
      true
    )
  })

  it("refuses it to any other origin", () => {
    expect(
      grantsPermission(ORIGIN, {
        permission: "media",
        url: "https://example.com/",
        mediaTypes: ["audio"],
      })
    ).toBe(false)
    expect(
      grantsPermission(ORIGIN, {
        permission: "media",
        url: "http://localhost:3001/",
        mediaTypes: ["audio"],
      })
    ).toBe(false)
  })

  it("refuses the camera, and every other permission", () => {
    expect(
      grantsPermission(ORIGIN, {
        permission: "media",
        url: ORIGIN,
        mediaTypes: ["audio", "video"],
      })
    ).toBe(false)
    expect(
      grantsPermission(ORIGIN, { permission: "notifications", url: ORIGIN })
    ).toBe(false)
  })

  it("refuses a request with no usable URL", () => {
    expect(grantsPermission(ORIGIN, { permission: "media", url: "" })).toBe(
      false
    )
  })
})
