import { describe, expect, it } from "vitest"

import {
  createWidgetBoard,
  WIDGET_BOARD_STORAGE_KEY,
  type BoardWidget,
  type WidgetBoardStorage,
} from "./board"

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

  it("describes the layout for Jarvis: id, name and whether it is Shown", () => {
    const widgets = board(NAMED)
    widgets.hide("clock")

    expect(widgets.describeLayout()).toEqual([
      { id: "weather", name: "Tiempo", shown: true },
      { id: "clock", name: "Reloj", shown: false },
    ])
  })
})
