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

  it("refuses the camera", () => {
    expect(
      grantsPermission(ORIGIN, {
        permission: "media",
        url: ORIGIN,
        mediaTypes: ["audio", "video"],
      })
    ).toBe(false)
  })

  it("refuses a request with no usable URL", () => {
    expect(grantsPermission(ORIGIN, { permission: "media", url: "" })).toBe(
      false
    )
  })
})

describe("Which pages get the Owner's location", () => {
  // The Weather Widget asks for it, falling back to a default city.
  it("grants it to Jarvis's own pages", () => {
    expect(
      grantsPermission(ORIGIN, { permission: "geolocation", url: `${ORIGIN}/` })
    ).toBe(true)
  })

  it("refuses it to any other origin", () => {
    expect(
      grantsPermission(ORIGIN, {
        permission: "geolocation",
        url: "https://example.com/",
      })
    ).toBe(false)
  })
})

describe("Every other permission", () => {
  it("is refused, even to Jarvis's own pages, since Jarvis uses none", () => {
    for (const permission of [
      "notifications",
      "display-capture",
      "clipboard-read",
      "midi",
      "openExternal",
    ]) {
      expect(grantsPermission(ORIGIN, { permission, url: ORIGIN })).toBe(false)
    }
  })
})
