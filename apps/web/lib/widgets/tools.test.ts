import { describe, expect, it } from "vitest"
import { z } from "zod"

import { WIDGET_CATALOG, type WidgetInfo } from "./catalog"
import { createWidgetTools, widgetLayoutNotice } from "./tools"

const CATALOG: WidgetInfo[] = [
  {
    id: "weather",
    name: "Tiempo",
    description: "El tiempo actual.",
    source: "built-in",
    settingsSchema: z.object({
      place: z.string().optional().describe("El lugar; sin él, el del dueño."),
    }),
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

  it("records a move change for move_widget", async () => {
    const turn = createWidgetTools(CATALOG)

    const result = await call(turn, "move_widget", {
      id: "weather",
      spot: "left-bottom",
    })

    expect(turn.changes()).toEqual([
      { type: "move", id: "weather", spot: "left-bottom" },
    ])
    expect(result).toMatch(/Tiempo/)
  })

  it("answers an invalid Spot or id for move_widget with an error and records nothing", async () => {
    const turn = createWidgetTools(CATALOG)

    const badSpot = await call(turn, "move_widget", {
      id: "weather",
      spot: "center",
    })
    const badId = await call(turn, "move_widget", {
      id: "stocks",
      spot: "left-top",
    })

    expect(turn.changes()).toEqual([])
    expect(badSpot).toMatch(/left-top/)
    expect(badId).toMatch(/no existe/)
  })

  it("offers the six Spots to move_widget", () => {
    const { tools } = createWidgetTools(CATALOG)

    const description = tools.move_widget?.description ?? ""
    expect(description).toContain("weather")
    for (const spot of ["left-top", "right-middle", "right-bottom"]) {
      expect(description).toContain(spot)
    }
  })

  it("keeps each Turn's changes separate", async () => {
    const first = createWidgetTools(CATALOG)
    await call(first, "hide_widget", { id: "weather" })

    expect(createWidgetTools(CATALOG).changes()).toEqual([])
  })
})

describe("show_widget with Widget Settings", () => {
  it("records the Widget Settings with the show change", async () => {
    const turn = createWidgetTools(CATALOG)

    const result = await call(turn, "show_widget", {
      id: "weather",
      settings: { place: "Londres" },
    })

    expect(turn.changes()).toEqual([
      { type: "show", id: "weather", settings: { place: "Londres" } },
    ])
    expect(result).toMatch(/Tiempo/)
  })

  it("records empty Widget Settings, which point the Widget back to its defaults", async () => {
    const turn = createWidgetTools(CATALOG)

    await call(turn, "show_widget", { id: "weather", settings: {} })

    expect(turn.changes()).toEqual([
      { type: "show", id: "weather", settings: {} },
    ])
  })

  it("answers invalid Widget Settings with an error and records nothing", async () => {
    const turn = createWidgetTools(CATALOG)

    const wrongType = await call(turn, "show_widget", {
      id: "weather",
      settings: { place: 42 },
    })
    const noSettings = await call(turn, "show_widget", {
      id: "clock",
      settings: { city: "Lima" },
    })

    expect(turn.changes()).toEqual([])
    expect(wrongType).toMatch(/no son válidos/)
    expect(noSettings).toMatch(/no tiene ajustes/)
  })

  it("describes each Widget's Widget Settings in show_widget", () => {
    const { tools } = createWidgetTools(CATALOG)

    const description = tools.show_widget?.description ?? ""
    expect(description).toContain("place")
    expect(description).toContain("El lugar; sin él, el del dueño.")
  })
})

describe("Widget layout notice", () => {
  it("tells Jarvis which Widgets are Shown and which are Hidden", () => {
    const notice = widgetLayoutNotice([
      {
        id: "weather",
        name: "Tiempo",
        shown: true,
        expanded: false,
        spot: "right-top",
        settings: {},
      },
      {
        id: "clock",
        name: "Reloj",
        shown: false,
        expanded: false,
        spot: "left-middle",
        settings: {},
      },
    ])

    expect(notice).toContain("weather (Tiempo): visible, en right-top")
    expect(notice).toContain("clock (Reloj): oculto, en left-middle")
  })
})

describe("Widget layout notice with Widget Settings", () => {
  it("tells Jarvis each Widget's Widget Settings", () => {
    const notice = widgetLayoutNotice([
      {
        id: "weather",
        name: "Tiempo",
        shown: true,
        expanded: false,
        spot: "right-top",
        settings: { place: "Londres" },
      },
    ])

    expect(notice).toContain('ajustes {"place":"Londres"}')
  })
})

describe("Jarvis's tools for Expanded Widgets", () => {
  const WITH_EXPANDABLE: WidgetInfo[] = [
    ...CATALOG,
    {
      id: "results",
      name: "Resultados",
      description: "Lo que encontró la última búsqueda.",
      source: "built-in",
      expandable: true,
    },
    {
      id: "browser",
      name: "Navegador",
      description: "La navegación actual en directo.",
      source: "built-in",
      expandable: true,
    },
  ]

  it("records an expand change for an Expandable Widget", async () => {
    const turn = createWidgetTools(WITH_EXPANDABLE)

    const results = await call(turn, "expand_widget", { id: "results" })
    await call(turn, "expand_widget", { id: "browser" })

    expect(turn.changes()).toEqual([
      { type: "expand", id: "results" },
      { type: "expand", id: "browser" },
    ])
    expect(results).toMatch(/Resultados/)
  })

  it("answers in Spanish and records nothing for a Widget that can't be Expanded, or doesn't exist", async () => {
    const turn = createWidgetTools(WITH_EXPANDABLE)

    const weather = await call(turn, "expand_widget", { id: "weather" })
    const unknown = await call(turn, "expand_widget", { id: "stocks" })

    expect(turn.changes()).toEqual([])
    expect(weather).toMatch(/Tiempo.*no se puede ampliar/)
    expect(weather).toMatch(/results, browser/)
    expect(unknown).toMatch(/no existe/)
  })

  it("lists only the Expandable Widgets in expand_widget", () => {
    const { tools } = createWidgetTools(WITH_EXPANDABLE)

    const description = tools.expand_widget?.description ?? ""
    expect(description).toContain("results")
    expect(description).toContain("browser")
    expect(description).not.toContain("weather")
    expect(description).not.toContain("clock")
  })

  it("records a collapse change for collapse_widget", async () => {
    const turn = createWidgetTools(WITH_EXPANDABLE)

    await call(turn, "collapse_widget", {})

    expect(turn.changes()).toEqual([{ type: "collapse" }])
  })

  it("tells Jarvis which Widget is Expanded", () => {
    const notice = widgetLayoutNotice([
      {
        id: "weather",
        name: "Tiempo",
        shown: true,
        expanded: false,
        spot: "right-top",
        settings: {},
      },
      {
        id: "results",
        name: "Resultados",
        shown: true,
        expanded: true,
        spot: "left-top",
        settings: {},
      },
    ])

    expect(notice).toContain("results (Resultados): visible, ampliado,")
    expect(notice).toContain("weather (Tiempo): visible, en right-top")
    expect(notice.match(/ampliado/g)).toHaveLength(1)
  })
})

describe("Jarvis's tools for its own Widgets", () => {
  it("offers the Today Widget, but never to expand", () => {
    const { tools } = createWidgetTools(WIDGET_CATALOG)

    for (const name of ["show_widget", "hide_widget", "move_widget"]) {
      expect(tools[name]?.description).toContain("- today (Hoy): ")
    }
    expect(tools.expand_widget?.description).not.toContain("today (Hoy)")
  })

  it("offers the System Widget, but never to expand", async () => {
    const turn = createWidgetTools(WIDGET_CATALOG)

    for (const name of ["show_widget", "hide_widget", "move_widget"]) {
      expect(turn.tools[name]?.description).toContain("- system (Sistema): ")
    }
    expect(turn.tools.expand_widget?.description).not.toContain("system")
    expect(await call(turn, "expand_widget", { id: "system" })).toMatch(
      /Sistema no se puede ampliar/
    )
    expect(turn.changes()).toEqual([])
  })
})
