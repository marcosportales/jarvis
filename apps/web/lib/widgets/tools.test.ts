import { describe, expect, it } from "vitest"

import type { WidgetInfo } from "./catalog"
import { createWidgetTools, widgetLayoutNotice } from "./tools"

const CATALOG: WidgetInfo[] = [
  {
    id: "weather",
    name: "Tiempo",
    description: "El tiempo actual.",
    source: "built-in",
  },
  {
    id: "clock",
    name: "Reloj",
    description: "La hora en otras ciudades.",
    source: "built-in",
  },
]

async function call(
  turn: ReturnType<typeof createWidgetTools>,
  name: string,
  input: unknown
) {
  const execute = turn.tools[name]?.execute
  if (!execute) throw new Error(`no tool ${name}`)
  return execute(input, { toolCallId: "call-1", messages: [], context: {} })
}

describe("Jarvis's Widget tools for a Turn", () => {
  it("records a show change for show_widget", async () => {
    const turn = createWidgetTools(CATALOG)

    const result = await call(turn, "show_widget", { id: "weather" })

    expect(turn.changes()).toEqual([{ type: "show", id: "weather" }])
    expect(result).toMatch(/Tiempo/)
  })

  it("records a hide change for hide_widget", async () => {
    const turn = createWidgetTools(CATALOG)

    await call(turn, "hide_widget", { id: "clock" })

    expect(turn.changes()).toEqual([{ type: "hide", id: "clock" }])
  })

  it("records several changes in the order they were made", async () => {
    const turn = createWidgetTools(CATALOG)

    await call(turn, "hide_widget", { id: "weather" })
    await call(turn, "show_widget", { id: "clock" })

    expect(turn.changes()).toEqual([
      { type: "hide", id: "weather" },
      { type: "show", id: "clock" },
    ])
  })

  it("answers an unknown id with a model-facing error and records nothing", async () => {
    const turn = createWidgetTools(CATALOG)

    const shown = await call(turn, "show_widget", { id: "stocks" })
    const hidden = await call(turn, "hide_widget", { id: "stocks" })

    expect(turn.changes()).toEqual([])
    expect(shown).toMatch(/no existe/)
    expect(shown).toMatch(/weather/)
    expect(hidden).toMatch(/no existe/)
  })

  it("lists every Widget's id and description in the tool descriptions", () => {
    const { tools } = createWidgetTools(CATALOG)

    for (const name of ["show_widget", "hide_widget"]) {
      const description = tools[name]?.description ?? ""
      expect(description).toContain("weather")
      expect(description).toContain("El tiempo actual.")
      expect(description).toContain("clock")
      expect(description).toContain("La hora en otras ciudades.")
    }
  })

  it("keeps each Turn's changes separate", async () => {
    const first = createWidgetTools(CATALOG)
    await call(first, "hide_widget", { id: "weather" })

    expect(createWidgetTools(CATALOG).changes()).toEqual([])
  })
})

describe("Widget layout notice", () => {
  it("tells Jarvis which Widgets are Shown and which are Hidden", () => {
    const notice = widgetLayoutNotice([
      { id: "weather", name: "Tiempo", shown: true },
      { id: "clock", name: "Reloj", shown: false },
    ])

    expect(notice).toContain("weather (Tiempo): visible")
    expect(notice).toContain("clock (Reloj): oculto")
  })
})
