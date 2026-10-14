import { describe, expect, it } from "vitest"

import { relativeDate, sessionLabel } from "./labels"

const NOW = new Date("2026-10-14T10:00:00Z")
const ago = (ms: number) => new Date(NOW.getTime() - ms)
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe("relativeDate", () => {
  it("says how long ago, in Spanish", () => {
    expect(relativeDate(ago(10_000), NOW)).toBe("ahora")
    expect(relativeDate(ago(5 * MINUTE), NOW)).toBe("hace 5 minutos")
    expect(relativeDate(ago(3 * HOUR), NOW)).toBe("hace 3 horas")
    expect(relativeDate(ago(DAY), NOW)).toBe("hace 1 día")
    expect(relativeDate(ago(2 * DAY), NOW)).toBe("hace 2 días")
    expect(relativeDate(ago(14 * DAY), NOW)).toBe("hace 2 semanas")
    expect(relativeDate(ago(60 * DAY), NOW)).toBe("hace 2 meses")
    expect(relativeDate(ago(800 * DAY), NOW)).toBe("hace 2 años")
  })
})

describe("sessionLabel", () => {
  it("is the Session Title once there is one", () => {
    expect(sessionLabel({ title: "Viaje a Lisboa", createdAt: NOW })).toBe(
      "Viaje a Lisboa"
    )
  })

  it("falls back to the Session's date while untitled", () => {
    expect(sessionLabel({ title: null, createdAt: NOW })).toMatch(
      /^Sesión del 14 oct/
    )
  })
})
