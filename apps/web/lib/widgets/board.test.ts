import { describe, expect, it } from "vitest"

import {
  createWidgetBoard,
  WIDGET_BOARD_STORAGE_KEY,
  type BoardWidget,
  type WidgetBoardStorage,
} from "./board"

const VIEWPORT = { width: 1600, height: 1000 }
const WIDGET_SIZE = { width: 200, height: 100 }

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
  storage = memoryStorage().storage
) {
  return createWidgetBoard({
    registry,
    storage,
    viewport: VIEWPORT,
    widgetSize: WIDGET_SIZE,
    random: () => 0.5,
  })
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
