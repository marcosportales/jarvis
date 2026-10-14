import { describe, expect, it } from "vitest"

import { formatToday, msUntilNextMinute } from "./today"

describe("Today Widget text", () => {
  it("gives the weekday and date in Spanish and the time as HH:mm", () => {
    const now = new Date("2026-10-14T16:42:30Z")

    expect(formatToday(now, "Europe/Madrid")).toEqual({
      date: "miércoles, 14 de octubre de 2026",
      time: "18:42",
    })
  })

  it("pads single-digit hours and minutes", () => {
    const now = new Date("2026-03-03T07:05:00Z")

    expect(formatToday(now, "UTC")).toEqual({
      date: "martes, 3 de marzo de 2026",
      time: "07:05",
    })
  })

  it("shows midnight as 00:00 on the new day", () => {
    const now = new Date("2026-12-31T23:00:00Z")

    expect(formatToday(now, "Europe/Madrid")).toEqual({
      date: "viernes, 1 de enero de 2027",
      time: "00:00",
    })
  })

  it("uses the given time zone, even when it's another day there", () => {
    const now = new Date("2026-10-15T02:30:00Z")

    expect(formatToday(now, "America/Mexico_City")).toEqual({
      date: "miércoles, 14 de octubre de 2026",
      time: "20:30",
    })
    expect(formatToday(now, "Asia/Tokyo")).toEqual({
      date: "jueves, 15 de octubre de 2026",
      time: "11:30",
    })
  })
})

describe("Today Widget timer", () => {
  it("waits until the next minute starts", () => {
    expect(msUntilNextMinute(new Date("2026-10-14T16:42:30.250Z"))).toBe(29_750)
  })

  it("waits a whole minute exactly on the minute", () => {
    expect(msUntilNextMinute(new Date("2026-10-14T16:42:00Z"))).toBe(60_000)
  })
})
