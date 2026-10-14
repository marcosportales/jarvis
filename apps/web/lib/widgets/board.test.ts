import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  createWidgetBoard,
  WIDGET_BOARD_STORAGE_KEY,
  type BoardWidget,
  type WidgetBoardStorage,
} from "./board"
import { WIDGET_CATALOG } from "./catalog"

const VIEWPORT = { width: 1600, height: 1000 }
const WIDGET_SIZE = { width: 200, height: 100 }
/** The orb and Transcript column spans 500–1100px of the viewport. */
const COLUMN_WIDTH = 600

const WEATHER: BoardWidget = { id: "weather", startingSpot: "right-top" }
const CLOCK: BoardWidget = { id: "clock", startingSpot: "left-bottom" }

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  const storage: WidgetBoardStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  }
  return { storage, items }
}

function board(
  registry: BoardWidget[] = [WEATHER],
  storage = memoryStorage().storage,
  random = () => 0.5
) {
  return createWidgetBoard({
    registry,
    storage,
    viewport: VIEWPORT,
    widgetSize: WIDGET_SIZE,
    columnWidth: COLUMN_WIDTH,
    random,
  })
}

/** A repeatable stand-in for `Math.random`. */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31
    return state / 2 ** 31
  }
}

function overlaps(a: { left: number; top: number }, b: typeof a) {
  return (
    Math.abs(a.left - b.left) < WIDGET_SIZE.width &&
    Math.abs(a.top - b.top) < WIDGET_SIZE.height
  )
}

/** Converts a Widget's stored fractions back to pixels for readable checks. */
function pixels(position: { x: number; y: number }) {
  return {
    left: Math.round(position.x * VIEWPORT.width),
    top: Math.round(position.y * VIEWPORT.height),
  }
}

describe("Widget Board", () => {
  it("Shows a Widget at its Starting Spot on first run", () => {
    const widget = board().getSnapshot().widgets[0]!

    expect(widget.id).toBe("weather")
    expect(widget.shown).toBe(true)
    // Top-right: 16px in from the right and top edges of a 1600×1000 viewport.
    expect(pixels(widget.position)).toEqual({ left: 1384, top: 16 })
  })

  it("Hides and Shows a Widget, telling subscribers each time", () => {
    const widgets = board()
    const seen: boolean[] = []
    widgets.subscribe(() => seen.push(widgets.getSnapshot().widgets[0]!.shown))

    widgets.hide("weather")
    widgets.show("weather")

    expect(seen).toEqual([false, true])
  })

  it("keeps a Widget's place when it is Hidden and Shown again", () => {
    const widgets = board()
    const before = widgets.getSnapshot().widgets[0]!.position

    widgets.hide("weather")
    widgets.show("weather")

    expect(widgets.getSnapshot().widgets[0]!.position).toEqual(before)
  })

  it("ignores Widgets that aren't in the registry", () => {
    const widgets = board()
    const before = widgets.getSnapshot()

    widgets.hide("nope")

    expect(widgets.getSnapshot()).toBe(before)
  })

  it("saves after each change and loads it on the next start", () => {
    const { storage, items } = memoryStorage()
    board([WEATHER], storage).hide("weather")
    expect(items.has(WIDGET_BOARD_STORAGE_KEY)).toBe(true)

    const reloaded = board([WEATHER], storage).getSnapshot().widgets[0]!

    expect(reloaded.shown).toBe(false)
    expect(pixels(reloaded.position)).toEqual({ left: 1384, top: 16 })
  })

  it("loads a Shown Widget back Shown after Hide then Show", () => {
    const { storage } = memoryStorage()
    const first = board([WEATHER], storage)
    first.hide("weather")
    first.show("weather")

    expect(board([WEATHER], storage).getSnapshot().widgets[0]!.shown).toBe(true)
  })

  it.each([
    ["unreadable", "{not json"],
    ["an old version", JSON.stringify({ version: 0, widgets: {} })],
    ["the wrong shape", JSON.stringify({ version: 1, widgets: "weather" })],
    [
      "a bad Widget entry",
      JSON.stringify({ version: 1, widgets: { weather: { shown: "no" } } }),
    ],
  ])("falls back to defaults when the saved layout is %s", (_, saved) => {
    const { storage } = memoryStorage({ [WIDGET_BOARD_STORAGE_KEY]: saved })

    const widget = board([WEATHER], storage).getSnapshot().widgets[0]!

    expect(widget.shown).toBe(true)
    expect(pixels(widget.position)).toEqual({ left: 1384, top: 16 })
  })

  it("gives a Widget new to the registry its defaults, keeping the others", () => {
    const { storage } = memoryStorage()
    board([WEATHER], storage).hide("weather")

    const [weather, clock] = board([WEATHER, CLOCK], storage).getSnapshot()
      .widgets

    expect(weather!.shown).toBe(false)
    expect(clock!.shown).toBe(true)
    expect(pixels(clock!.position)).toEqual({ left: 16, top: 884 })
  })

  it("drops Widgets that left the registry", () => {
    const { storage } = memoryStorage()
    board([WEATHER, CLOCK], storage).hide("clock")

    const reloaded = board([WEATHER], storage)
    reloaded.hide("weather")

    expect(reloaded.getSnapshot().widgets.map((widget) => widget.id)).toEqual([
      "weather",
    ])
    const restored = board([WEATHER, CLOCK], storage).getSnapshot().widgets
    expect(restored.find((widget) => widget.id === "clock")!.shown).toBe(true)
  })

  it("moves a dragged Widget and remembers it on the next start", () => {
    const { storage } = memoryStorage()
    board([WEATHER], storage).drag("weather", { left: 700, top: 400 })

    const reloaded = board([WEATHER], storage).getSnapshot().widgets[0]!

    expect(pixels(reloaded.position)).toEqual({ left: 700, top: 400 })
  })

  it("keeps a Widget dragged past the edge fully inside the window", () => {
    const widgets = board()

    widgets.drag("weather", { left: 1550, top: -40 })

    // 1600 − 200 wide, and no higher than the top edge.
    expect(pixels(widgets.getSnapshot().widgets[0]!.position)).toEqual({
      left: 1400,
      top: 0,
    })
  })

  it("pulls Widgets back into a shrunk window and remembers it", () => {
    const { storage } = memoryStorage()
    const widgets = board([WEATHER], storage)

    widgets.resize({ width: 800, height: 500 })

    // Was 16px from the right of 1600; now the right edge of 800 − 200 wide.
    const resized = widgets.getSnapshot().widgets[0]!.position
    expect({
      left: Math.round(resized.x * 800),
      top: Math.round(resized.y * 500),
    }).toEqual({ left: 600, top: 8 })
    const reloaded = board([WEATHER], storage).getSnapshot().widgets[0]!
    expect(reloaded.position).toEqual(resized)
  })

  it("pulls a layout saved in a wider window into view on start", () => {
    const { storage } = memoryStorage()
    board([WEATHER], storage).drag("weather", { left: 1400, top: 900 })

    const widget = createWidgetBoard({
      registry: [WEATHER],
      storage,
      viewport: { width: 800, height: 500 },
      widgetSize: WIDGET_SIZE,
      columnWidth: COLUMN_WIDTH,
      random: () => 0.5,
    }).getSnapshot().widgets[0]!

    expect({
      left: Math.round(widget.position.x * 800),
      top: Math.round(widget.position.y * 500),
    }).toEqual({ left: 600, top: 400 })
  })

  it.each([1, 2, 3, 4, 5])(
    "places Widgets without a Starting Spot in a free place in the margins (seed %i)",
    (seed) => {
      const registry = [
        WEATHER,
        ...["notes", "clock", "news", "music"].map((id) => ({ id })),
      ]

      const placed = board(
        registry,
        memoryStorage().storage,
        seededRandom(seed)
      )
        .getSnapshot()
        .widgets.map((widget) => pixels(widget.position))

      for (const [index, at] of placed.entries()) {
        const inLeftMargin = at.left >= 0 && at.left + 200 <= 500
        const inRightMargin = at.left >= 1100 && at.left + 200 <= 1600
        expect(inLeftMargin || inRightMargin).toBe(true)
        expect(at.top).toBeGreaterThanOrEqual(0)
        expect(at.top + 100).toBeLessThanOrEqual(1000)
        for (const other of placed.slice(0, index)) {
          expect(overlaps(at, other)).toBe(false)
        }
      }
    }
  )

  it("uses both margins for Widgets without a Starting Spot", () => {
    const registry = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }))

    const sides = board(registry, memoryStorage().storage, seededRandom(7))
      .getSnapshot()
      .widgets.map((widget) =>
        pixels(widget.position).left < 800 ? "left" : "right"
      )

    expect(new Set(sides)).toEqual(new Set(["left", "right"]))
  })

  it("keeps a randomly placed Widget's place on the next start", () => {
    const { storage } = memoryStorage()
    const registry = [WEATHER, { id: "notes" }]
    const first = board(registry, storage, seededRandom(1)).getSnapshot()

    const again = board(registry, storage, seededRandom(99)).getSnapshot()

    expect(again.widgets[1]!.position).toEqual(first.widgets[1]!.position)
  })
})

describe("Widget Board and Jarvis", () => {
  const NAMED = [
    { ...WEATHER, name: "Tiempo" },
    { ...CLOCK, name: "Reloj" },
  ]

  it("applies a Turn's Widget changes in order and saves them", () => {
    const { storage } = memoryStorage()
    const widgets = board(NAMED, storage)

    widgets.applyChanges([
      { type: "hide", id: "weather" },
      { type: "hide", id: "clock" },
      { type: "show", id: "clock" },
    ])

    const shown = (b: ReturnType<typeof board>) =>
      b.getSnapshot().widgets.map(({ id, shown }) => [id, shown])
    expect(shown(widgets)).toEqual([
      ["weather", false],
      ["clock", true],
    ])
    expect(shown(board(NAMED, storage))).toEqual(shown(widgets))
  })

  it("skips Widget changes for Widgets it doesn't know", () => {
    const widgets = board(NAMED)

    widgets.applyChanges([
      { type: "hide", id: "stocks" },
      { type: "hide", id: "weather" },
    ])

    expect(widgets.getSnapshot().widgets[0]!.shown).toBe(false)
  })

  it("describes the layout for Jarvis: id, name, Shown, Expanded and Spot", () => {
    const widgets = board(NAMED)
    widgets.hide("clock")

    expect(widgets.describeLayout()).toEqual([
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
        spot: "left-bottom",
        settings: {},
      },
    ])
  })

  it("applies a Turn's move changes", () => {
    const widgets = board(NAMED)

    widgets.applyChanges([{ type: "move", id: "weather", spot: "left-middle" }])

    expect(pixels(widgets.getSnapshot().widgets[0]!.position)).toEqual({
      left: 16,
      top: 450,
    })
  })
})

describe("Widget Board Spots", () => {
  // 16px from the edges of a 1600×1000 viewport, for a 200×100 Widget.
  it.each([
    ["left-top", { left: 16, top: 16 }],
    ["left-middle", { left: 16, top: 450 }],
    ["left-bottom", { left: 16, top: 884 }],
    ["right-top", { left: 1384, top: 16 }],
    ["right-middle", { left: 1384, top: 450 }],
    ["right-bottom", { left: 1384, top: 884 }],
  ] as const)("moves a Widget to %s", (spot, expected) => {
    const { storage } = memoryStorage()
    board([WEATHER], storage).moveToSpot("weather", spot)

    const reloaded = board([WEATHER], storage).getSnapshot().widgets[0]!

    expect(pixels(reloaded.position)).toEqual(expected)
    expect(board([WEATHER], storage).describeLayout()[0]!.spot).toBe(spot)
  })

  it("Shows a Hidden Widget it moves", () => {
    const widgets = board()
    widgets.hide("weather")

    widgets.moveToSpot("weather", "left-top")

    expect(widgets.getSnapshot().widgets[0]!.shown).toBe(true)
  })

  it("stacks a Widget below the one already at a Spot", () => {
    const widgets = board([WEATHER, CLOCK])

    widgets.moveToSpot("clock", "right-top")

    const [weather, clock] = widgets.getSnapshot().widgets
    expect(pixels(weather!.position)).toEqual({ left: 1384, top: 16 })
    // Below it, with an 8px gap.
    expect(pixels(clock!.position)).toEqual({ left: 1384, top: 124 })
  })

  it("stacks a Widget above the one already at a bottom Spot", () => {
    const widgets = board([WEATHER, CLOCK])
    widgets.moveToSpot("weather", "left-bottom")

    const clock = widgets.getSnapshot().widgets[1]!
    const weather = widgets.getSnapshot().widgets[0]!
    expect(pixels(clock.position)).toEqual({ left: 16, top: 884 })
    expect(pixels(weather.position)).toEqual({ left: 16, top: 776 })
  })

  it("doesn't stack on a Hidden Widget at the Spot", () => {
    const widgets = board([WEATHER, CLOCK])
    widgets.hide("weather")

    widgets.moveToSpot("clock", "right-top")

    expect(pixels(widgets.getSnapshot().widgets[1]!.position)).toEqual({
      left: 1384,
      top: 16,
    })
  })

  it("tells Jarvis the nearest Spot of a dragged Widget", () => {
    const widgets = board()

    widgets.drag("weather", { left: 300, top: 600 })

    expect(widgets.describeLayout()[0]!.spot).toBe("left-middle")
  })

  it("glides only Widgets that moved to a Spot, never dragged ones", () => {
    const widgets = board()
    expect(widgets.getSnapshot().widgets[0]!.glide).toBe(false)

    widgets.moveToSpot("weather", "left-bottom")
    expect(widgets.getSnapshot().widgets[0]!.glide).toBe(true)

    widgets.drag("weather", { left: 300, top: 300 })
    expect(widgets.getSnapshot().widgets[0]!.glide).toBe(false)
  })

  it("ignores a move for a Widget it doesn't know", () => {
    const widgets = board()
    const before = widgets.getSnapshot()

    widgets.moveToSpot("stocks", "left-top")

    expect(widgets.getSnapshot()).toBe(before)
  })
})

describe("Widget Board with a Widget of its own size", () => {
  const RESULTS: BoardWidget = {
    id: "results",
    startingSpot: "left-top",
    size: { width: 400, height: 300 },
  }

  it("places it at a Spot by its own size", () => {
    const widgets = board([RESULTS])

    widgets.moveToSpot("results", "right-bottom")

    // 16px in from the right and bottom edges for a 400×300 Widget.
    expect(pixels(widgets.getSnapshot().widgets[0]!.position)).toEqual({
      left: 1184,
      top: 684,
    })
    expect(widgets.describeLayout()[0]!.spot).toBe("right-bottom")
  })

  it("keeps it fully inside the window when dragged past the edge", () => {
    const widgets = board([RESULTS])

    widgets.drag("results", { left: 1500, top: 900 })

    expect(pixels(widgets.getSnapshot().widgets[0]!.position)).toEqual({
      left: 1200,
      top: 700,
    })
  })

  it("stacks a smaller Widget below it at its Spot", () => {
    const widgets = board([RESULTS, CLOCK])

    widgets.moveToSpot("clock", "left-top")

    // Below the 300px-tall Widget, with an 8px gap.
    expect(pixels(widgets.getSnapshot().widgets[1]!.position)).toEqual({
      left: 16,
      top: 324,
    })
  })
})

describe("Widget Board Widget Settings", () => {
  const WEATHER_WITH_PLACE: BoardWidget = {
    ...WEATHER,
    settingsSchema: z.object({ place: z.string().optional() }),
  }

  function settingsOf(widgets: ReturnType<typeof board>, id = "weather") {
    return widgets.getSnapshot().widgets.find((widget) => widget.id === id)!
      .settings
  }

  it("starts every Widget with its default Widget Settings", () => {
    const withDefaults: BoardWidget = {
      id: "clock",
      settingsSchema: z.object({ city: z.string().default("Madrid") }),
    }

    const widgets = board([WEATHER_WITH_PLACE, withDefaults, WEATHER])

    expect(settingsOf(widgets)).toEqual({})
    expect(settingsOf(widgets, "clock")).toEqual({ city: "Madrid" })
  })

  it("Shows a Widget with new Widget Settings", () => {
    const widgets = board([WEATHER_WITH_PLACE])
    widgets.hide("weather")

    widgets.show("weather", { place: "Londres" })

    expect(widgets.getSnapshot().widgets[0]!.shown).toBe(true)
    expect(settingsOf(widgets)).toEqual({ place: "Londres" })
  })

  it("keeps the Widget Settings when Shown without any", () => {
    const widgets = board([WEATHER_WITH_PLACE])
    widgets.show("weather", { place: "Londres" })

    widgets.hide("weather")
    widgets.show("weather")

    expect(settingsOf(widgets)).toEqual({ place: "Londres" })
  })

  it("replaces the Widget Settings, so empty ones go back to the defaults", () => {
    const widgets = board([WEATHER_WITH_PLACE])
    widgets.show("weather", { place: "Londres" })

    widgets.updateSettings("weather", {})

    expect(settingsOf(widgets)).toEqual({})
  })

  it("ignores invalid Widget Settings but still Shows the Widget", () => {
    const widgets = board([WEATHER_WITH_PLACE])
    widgets.show("weather", { place: "Londres" })
    widgets.hide("weather")

    widgets.show("weather", { place: 42 })
    widgets.updateSettings("weather", { place: ["París"] })

    expect(widgets.getSnapshot().widgets[0]!.shown).toBe(true)
    expect(settingsOf(widgets)).toEqual({ place: "Londres" })
  })

  it("ignores Widget Settings for a Widget that has none", () => {
    const widgets = board([WEATHER])

    widgets.show("weather", { place: "Londres" })

    expect(settingsOf(widgets)).toEqual({})
  })

  it("applies a Turn's show change with Widget Settings", () => {
    const widgets = board([WEATHER_WITH_PLACE])

    widgets.applyChanges([
      { type: "show", id: "weather", settings: { place: "Londres" } },
    ])

    expect(settingsOf(widgets)).toEqual({ place: "Londres" })
  })

  it("remembers the Widget Settings on the next start", () => {
    const { storage } = memoryStorage()
    board([WEATHER_WITH_PLACE], storage).show("weather", { place: "Londres" })

    expect(settingsOf(board([WEATHER_WITH_PLACE], storage))).toEqual({
      place: "Londres",
    })
  })

  it("loads a layout saved before Widget Settings existed, keeping its place", () => {
    const { storage } = memoryStorage({
      [WIDGET_BOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        widgets: { weather: { shown: false, position: { x: 0.1, y: 0.2 } } },
      }),
    })

    const widget = board([WEATHER_WITH_PLACE], storage).getSnapshot()
      .widgets[0]!

    expect(widget.shown).toBe(false)
    expect(widget.position).toEqual({ x: 0.1, y: 0.2 })
    expect(widget.settings).toEqual({})
  })

  it("falls back to the defaults when saved Widget Settings are invalid", () => {
    const { storage } = memoryStorage({
      [WIDGET_BOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        widgets: {
          weather: {
            shown: true,
            position: { x: 0.1, y: 0.2 },
            settings: { place: 42 },
          },
        },
      }),
    })

    const widget = board([WEATHER_WITH_PLACE], storage).getSnapshot()
      .widgets[0]!

    expect(widget.position).toEqual({ x: 0.1, y: 0.2 })
    expect(widget.settings).toEqual({})
  })

  it("tells Jarvis each Widget's Widget Settings", () => {
    const widgets = board([WEATHER_WITH_PLACE])
    widgets.show("weather", { place: "Londres" })

    expect(widgets.describeLayout()[0]!.settings).toEqual({ place: "Londres" })
  })
})

describe("Widget Board Expanded Widget", () => {
  const RESULTS: BoardWidget = {
    id: "results",
    startingSpot: "left-top",
    expandable: true,
  }
  const BROWSER: BoardWidget = {
    id: "browser",
    startingSpot: "left-middle",
    expandable: true,
  }

  function expandable(storage = memoryStorage().storage) {
    return board([WEATHER, RESULTS, BROWSER], storage)
  }

  function stateOf(widgets: ReturnType<typeof board>, id: string) {
    return widgets.getSnapshot().widgets.find((widget) => widget.id === id)!
  }

  it("starts with nothing Expanded", () => {
    expect(expandable().getSnapshot().expanded).toBeNull()
  })

  it("Expands an Expandable Widget and tells its subscribers", () => {
    const widgets = expandable()
    let notified = 0
    widgets.subscribe(() => notified++)

    widgets.expand("results")

    expect(widgets.getSnapshot().expanded).toBe("results")
    expect(notified).toBe(1)
  })

  it("doesn't Expand a Widget that isn't Expandable, or one it doesn't know", () => {
    const widgets = expandable()
    const before = widgets.getSnapshot()

    widgets.expand("weather")
    widgets.expand("stocks")

    expect(widgets.getSnapshot()).toBe(before)
  })

  it("Collapses the first Widget when it Expands a second one", () => {
    const widgets = expandable()
    widgets.expand("results")

    widgets.expand("browser")

    expect(widgets.getSnapshot().expanded).toBe("browser")
  })

  it("Shows a Hidden Widget it Expands", () => {
    const widgets = expandable()
    widgets.hide("browser")

    widgets.expand("browser")

    expect(stateOf(widgets, "browser").shown).toBe(true)
    expect(widgets.getSnapshot().expanded).toBe("browser")
  })

  it("Collapses the Widget back to its place, still Shown", () => {
    const widgets = expandable()
    widgets.drag("results", { left: 300, top: 400 })
    const before = stateOf(widgets, "results")
    widgets.expand("results")

    widgets.collapse()

    expect(widgets.getSnapshot().expanded).toBeNull()
    expect(stateOf(widgets, "results")).toEqual(before)
  })

  it("does nothing when it Collapses with nothing Expanded", () => {
    const widgets = expandable()
    const before = widgets.getSnapshot()

    widgets.collapse()

    expect(widgets.getSnapshot()).toBe(before)
  })

  it("Collapses the Expanded Widget it hides, so it comes back Collapsed", () => {
    const widgets = expandable()
    widgets.expand("results")

    widgets.hide("results")
    expect(widgets.getSnapshot().expanded).toBeNull()

    widgets.show("results")
    expect(widgets.getSnapshot().expanded).toBeNull()
  })

  it("keeps the Expanded Widget when it hides another", () => {
    const widgets = expandable()
    widgets.expand("results")

    widgets.hide("browser")

    expect(widgets.getSnapshot().expanded).toBe("results")
  })

  it("Collapses the Expanded Widget it moves, at its new Spot", () => {
    const widgets = expandable()
    widgets.expand("results")

    widgets.moveToSpot("results", "right-bottom")

    expect(widgets.getSnapshot().expanded).toBeNull()
    expect(widgets.describeLayout()[1]!.spot).toBe("right-bottom")
  })

  it("leaves the Expanded Widget when it moves another", () => {
    const widgets = expandable()
    widgets.expand("results")

    widgets.moveToSpot("browser", "right-bottom")

    expect(widgets.getSnapshot().expanded).toBe("results")
  })

  it("ignores a drag of the Expanded Widget", () => {
    const widgets = expandable()
    widgets.expand("results")
    const before = widgets.getSnapshot()

    widgets.drag("results", { left: 900, top: 900 })

    expect(widgets.getSnapshot()).toBe(before)
  })

  it("never remembers the Expanded Widget on the next start", () => {
    const { storage } = memoryStorage()
    const first = expandable(storage)
    first.expand("results")
    // Something else changes, so the layout is saved while it is Expanded.
    first.moveToSpot("browser", "right-top")

    expect(expandable(storage).getSnapshot().expanded).toBeNull()
  })

  it("tells Jarvis which Widget is Expanded", () => {
    const widgets = expandable()
    widgets.expand("browser")

    expect(
      widgets.describeLayout().map(({ id, expanded }) => [id, expanded])
    ).toEqual([
      ["weather", false],
      ["results", false],
      ["browser", true],
    ])
  })

  it("applies a Turn's expand and collapse changes in order with the others", () => {
    const widgets = expandable()
    widgets.hide("browser")

    widgets.applyChanges([
      { type: "expand", id: "results" },
      { type: "collapse" },
      { type: "expand", id: "browser" },
      { type: "hide", id: "weather" },
    ])

    expect(widgets.getSnapshot().expanded).toBe("browser")
    expect(stateOf(widgets, "browser").shown).toBe(true)
    expect(stateOf(widgets, "weather").shown).toBe(false)

    widgets.applyChanges([{ type: "collapse" }])
    expect(widgets.getSnapshot().expanded).toBeNull()
  })
})

describe("Widget Board with Jarvis's own Widgets", () => {
  const spotOf = (widgets: ReturnType<typeof board>, id: string) =>
    widgets.describeLayout().find((widget) => widget.id === id)?.spot

  it("starts the Today Widget at right-top and the Weather Widget just below it", () => {
    const widgets = board([...WIDGET_CATALOG])

    expect(spotOf(widgets, "today")).toBe("right-top")
    expect(spotOf(widgets, "weather")).toBe("right-middle")
  })

  it("stacks the Today Widget below a Weather Widget saved at right-top before it existed", () => {
    const { storage } = memoryStorage()
    // The catalog before the Today Widget, which saves Weather's place on load.
    board(
      WIDGET_CATALOG.filter(({ id }) => id !== "today").map((widget) =>
        widget.id === "weather"
          ? { ...widget, startingSpot: "right-top" as const }
          : widget
      ),
      storage
    )

    const widgets = board([...WIDGET_CATALOG], storage)

    const position = (id: string) =>
      pixels(widgets.getSnapshot().widgets.find((w) => w.id === id)!.position)
    expect(position("weather")).toEqual({ left: 1384, top: 16 })
    // Below it, with an 8px gap.
    expect(position("today")).toEqual({ left: 1384, top: 124 })
  })

  it("keeps the Weather Widget where the Owner already placed it", () => {
    const { storage } = memoryStorage()
    board([...WIDGET_CATALOG], storage).moveToSpot("weather", "right-top")

    const reloaded = board([...WIDGET_CATALOG], storage)

    expect(spotOf(reloaded, "weather")).toBe("right-top")
  })
})
