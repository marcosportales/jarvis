import { z } from "zod"

import type { WidgetChange, WidgetLayout } from "./changes"

/**
 * The Widget Board owns the Widget layout: for each Widget in the registry,
 * whether it is Shown and where it sits. Framework-free, so the Jarvis page,
 * the sidebar and the Session can all share one per tab.
 */

export const SPOTS = [
  "left-top",
  "left-middle",
  "left-bottom",
  "right-top",
  "right-middle",
  "right-bottom",
] as const

/** One of six named places in the side margins; there is no centre Spot. */
export type Spot = (typeof SPOTS)[number]

/** What the Board needs to know about a registry entry. */
export type BoardWidget = {
  id: string
  /** Spanish; tells Jarvis which Widget is which. Defaults to the id. */
  name?: string
  startingSpot?: Spot
}

export type Size = { width: number; height: number }

/** Top-left corner as fractions of the viewport, so it survives resizes. */
export type WidgetPosition = { x: number; y: number }

/** A place on screen in pixels from the viewport's top-left corner. */
export type PixelPosition = { left: number; top: number }

export type WidgetState = {
  id: string
  shown: boolean
  position: WidgetPosition
  /** It last moved to a Spot, so the layer animates it; dragged ones don't. */
  glide: boolean
}

/** Widgets in registry order. */
export type WidgetBoardSnapshot = { widgets: WidgetState[] }

export type WidgetBoardOptions = {
  registry: readonly BoardWidget[]
  storage: WidgetBoardStorage
  viewport: Size
  widgetSize: Size
  /** Width of the centred orb and Transcript column the margins sit beside. */
  columnWidth: number
  /** Returns a number in [0, 1), like `Math.random`. */
  random: () => number
}

/** The slice of `localStorage` the Board uses, so tests can pass a fake. */
export type WidgetBoardStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** The one localStorage key holding the whole layout. */
export const WIDGET_BOARD_STORAGE_KEY = "jarvis.widgets"

/** Bump when the saved shape changes; older layouts fall back to defaults. */
const STORAGE_VERSION = 1

const savedLayoutSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  widgets: z.record(
    z.string(),
    z.object({
      shown: z.boolean(),
      position: z.object({ x: z.number(), y: z.number() }),
    })
  ),
})

type SavedLayout = z.infer<typeof savedLayoutSchema>

/** A missing, unreadable or outdated layout reads as nothing saved. */
function loadLayout(storage: WidgetBoardStorage): SavedLayout["widgets"] {
  try {
    const raw = storage.getItem(WIDGET_BOARD_STORAGE_KEY)
    if (raw === null) return {}
    const parsed = savedLayoutSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.widgets : {}
  } catch {
    return {}
  }
}

function saveLayout(
  storage: WidgetBoardStorage,
  snapshot: WidgetBoardSnapshot
) {
  const layout: SavedLayout = {
    version: STORAGE_VERSION,
    widgets: Object.fromEntries(
      snapshot.widgets.map(({ id, shown, position }) => [
        id,
        { shown, position },
      ])
    ),
  }
  try {
    storage.setItem(WIDGET_BOARD_STORAGE_KEY, JSON.stringify(layout))
  } catch (error) {
    // Full or blocked storage only costs remembering the layout.
    console.error("Saving the Widget layout failed", error)
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** Stores a pixel place as fractions, nudged so the whole Widget stays in view. */
function toPosition(
  at: PixelPosition,
  viewport: Size,
  widget: Size
): WidgetPosition {
  return {
    x: clamp(at.left, 0, viewport.width - widget.width) / viewport.width,
    y: clamp(at.top, 0, viewport.height - widget.height) / viewport.height,
  }
}

function toPixels(position: WidgetPosition, viewport: Size): PixelPosition {
  return {
    left: position.x * viewport.width,
    top: position.y * viewport.height,
  }
}

/** Space kept between a Widget at a Spot and the window's edges. */
const EDGE_GAP = 16

function spotPosition(
  spot: Spot,
  viewport: Size,
  widget: Size
): WidgetPosition {
  const [side, row] = spot.split("-") as [string, string]
  const left =
    side === "left" ? EDGE_GAP : viewport.width - widget.width - EDGE_GAP
  const top =
    row === "top"
      ? EDGE_GAP
      : row === "middle"
        ? (viewport.height - widget.height) / 2
        : viewport.height - widget.height - EDGE_GAP
  return toPosition({ left, top }, viewport, widget)
}

/** Space between Widgets stacked at one Spot. */
const STACK_GAP = 8

/** The Spot whose place is closest to `at`. */
function nearestSpot(at: PixelPosition, viewport: Size, widget: Size): Spot {
  const distance = (spot: Spot) => {
    const place = toPixels(spotPosition(spot, viewport, widget), viewport)
    return Math.hypot(place.left - at.left, place.top - at.top)
  }
  return SPOTS.reduce((best, spot) =>
    distance(spot) < distance(best) ? spot : best
  )
}

function overlaps(a: PixelPosition, b: PixelPosition, widget: Size) {
  return (
    Math.abs(a.left - b.left) < widget.width &&
    Math.abs(a.top - b.top) < widget.height
  )
}

/** Tries this many random places before settling for an overlapping one. */
const PLACEMENT_ATTEMPTS = 50

/**
 * A random place in the left or right margin beside the centred column,
 * clear of the `taken` places when there's room. A window too narrow for
 * margins uses the whole window.
 */
function randomMarginPlace(
  taken: PixelPosition[],
  viewport: Size,
  widget: Size,
  columnWidth: number,
  random: () => number
): PixelPosition {
  const columnLeft = (viewport.width - columnWidth) / 2
  const columnRight = (viewport.width + columnWidth) / 2
  const sides = [
    [EDGE_GAP, columnLeft - widget.width - EDGE_GAP],
    [columnRight + EDGE_GAP, viewport.width - widget.width - EDGE_GAP],
  ].filter(([min, max]) => min! <= max!)
  if (sides.length === 0) sides.push([0, viewport.width - widget.width])
  const [top, bottom] = [EDGE_GAP, viewport.height - widget.height - EDGE_GAP]

  let place: PixelPosition = { left: 0, top: 0 }
  for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
    const [min, max] = sides[Math.floor(random() * sides.length)]!
    place = {
      left: min! + random() * (max! - min!),
      top: top + random() * Math.max(0, bottom - top),
    }
    if (!taken.some((other) => overlaps(place, other, widget))) break
  }
  return place
}

export function createWidgetBoard(options: WidgetBoardOptions) {
  const { registry, storage, widgetSize, columnWidth, random } = options
  let viewport = options.viewport
  const listeners = new Set<() => void>()

  /**
   * Before a Widget is ever placed: Shown, at its Starting Spot, or else at a
   * random free place in the margins, clear of the `others` already placed.
   */
  function defaultState(
    widget: BoardWidget,
    others: WidgetState[]
  ): WidgetState {
    const taken = others
      .filter((other) => other.shown)
      .map((other) => toPixels(other.position, viewport))
    return {
      id: widget.id,
      shown: true,
      glide: false,
      position: widget.startingSpot
        ? spotPosition(widget.startingSpot, viewport, widgetSize)
        : toPosition(
            randomMarginPlace(taken, viewport, widgetSize, columnWidth, random),
            viewport,
            widgetSize
          ),
    }
  }

  /** The same place, nudged so the whole Widget fits the current viewport. */
  function inView(position: WidgetPosition) {
    return toPosition(toPixels(position, viewport), viewport, widgetSize)
  }

  // Saved Widgets no longer in the registry are dropped; new ones get defaults.
  // A layout saved in a bigger window is pulled into this one. Widgets with a
  // known place go first, so random places can steer clear of them.
  const saved = loadLayout(storage)
  const known = (widget: BoardWidget) =>
    widget.id in saved || widget.startingSpot !== undefined
  const placed: WidgetState[] = []
  for (const widget of [
    ...registry.filter(known),
    ...registry.filter((widget) => !known(widget)),
  ]) {
    const state = { ...defaultState(widget, placed), ...saved[widget.id] }
    placed.push({ ...state, position: inView(state.position) })
  }
  let snapshot: WidgetBoardSnapshot = {
    widgets: registry.map((widget) =>
      placed.find((state) => state.id === widget.id)!
    ),
  }
  // A random first place must not jump to another one on the next start.
  if (registry.some((widget) => !(widget.id in saved))) {
    saveLayout(storage, snapshot)
  }

  /** Saves and notifies only if some Widget actually changed. */
  function commit(widgets: WidgetState[]) {
    const changed = widgets.some((next, index) => {
      const current = snapshot.widgets[index]!
      return (
        next.shown !== current.shown ||
        next.glide !== current.glide ||
        next.position.x !== current.position.x ||
        next.position.y !== current.position.y
      )
    })
    if (!changed) return
    snapshot = { widgets }
    saveLayout(storage, snapshot)
    for (const listener of listeners) listener()
  }

  /** Replaces one Widget's state; unknown ids and no-op changes do nothing. */
  function update(id: string, change: Partial<Omit<WidgetState, "id">>) {
    commit(
      snapshot.widgets.map((widget) =>
        widget.id === id ? { ...widget, ...change } : widget
      )
    )
  }

  /**
   * Shows the Widget at the Spot; if another Shown Widget is there it stacks
   * below it, or above it at the bottom Spots, until it finds a free place.
   */
  function moveToSpot(id: string, spot: Spot) {
    if (!snapshot.widgets.some((widget) => widget.id === id)) return
    const taken = snapshot.widgets
      .filter((widget) => widget.id !== id && widget.shown)
      .map((widget) => toPixels(widget.position, viewport))
    const step =
      (widgetSize.height + STACK_GAP) * (spot.endsWith("bottom") ? -1 : 1)
    const place = toPixels(spotPosition(spot, viewport, widgetSize), viewport)
    for (let tries = 0; tries < taken.length; tries++) {
      if (!taken.some((other) => overlaps(place, other, widgetSize))) break
      place.top += step
    }
    update(id, {
      shown: true,
      glide: true,
      position: toPosition(place, viewport, widgetSize),
    })
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    show: (id: string) => update(id, { shown: true }),
    hide: (id: string) => update(id, { shown: false }),
    /** A Turn's Widget changes, in order; unknown ids are skipped. */
    applyChanges(changes: readonly WidgetChange[]) {
      for (const change of changes) {
        switch (change.type) {
          case "show":
            update(change.id, { shown: true })
            break
          case "hide":
            update(change.id, { shown: false })
            break
          case "move":
            moveToSpot(change.id, change.spot)
            break
        }
      }
    },
    /** What Jarvis is told about the layout each Turn. */
    describeLayout(): WidgetLayout {
      return snapshot.widgets.map(({ id, shown, position }) => ({
        id,
        name: registry.find((widget) => widget.id === id)?.name ?? id,
        shown,
        spot: nearestSpot(toPixels(position, viewport), viewport, widgetSize),
      }))
    },
    moveToSpot,
    /** The Owner dragged a Widget's top-left corner to `to`. */
    drag: (id: string, to: PixelPosition) =>
      update(id, {
        position: toPosition(to, viewport, widgetSize),
        glide: false,
      }),
    /** The window changed size; every Widget is kept fully inside it. */
    resize(next: Size) {
      viewport = next
      commit(
        snapshot.widgets.map((widget) => ({
          ...widget,
          position: inView(widget.position),
          glide: false,
        }))
      )
    },
  }
}

export type WidgetBoard = ReturnType<typeof createWidgetBoard>
