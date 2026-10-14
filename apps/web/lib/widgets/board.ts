import { z } from "zod"

import type { WidgetChange, WidgetLayout } from "./changes"

/**
 * The Widget Board owns the Widget layout: for each Widget in the registry,
 * whether it is Shown, where it sits and its Widget Settings, plus which one
 * is Expanded, if any. Framework-free, so the Jarvis page,
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

/** A Widget's own Widget Settings, like the Weather Widget's place. */
export type WidgetSettings = Record<string, unknown>

/** What the Board needs to know about a registry entry. */
export type BoardWidget = {
  id: string
  /** Spanish; tells Jarvis which Widget is which. Defaults to the id. */
  name?: string
  startingSpot?: Spot
  /** Its Widget Settings; parsing `{}` gives the defaults. None means none. */
  settingsSchema?: z.ZodType<WidgetSettings>
  /** Its size on screen when it differs from the Board's usual one. */
  size?: Size
  /** It can be Expanded. */
  expandable?: boolean
}

export type Size = { width: number; height: number }

/** Top-left corner as fractions of the viewport, so it survives resizes. */
export type WidgetPosition = { x: number; y: number }

/** A place on screen in pixels from the viewport's top-left corner. */
export type PixelPosition = { left: number; top: number }

/** A Widget's place on screen and its size, in pixels. */
type PixelRect = PixelPosition & Size

export type WidgetState = {
  id: string
  shown: boolean
  position: WidgetPosition
  /** It last moved to a Spot, so the layer animates it; dragged ones don't. */
  glide: boolean
  settings: WidgetSettings
}

export type WidgetBoardSnapshot = {
  /** In registry order. */
  widgets: WidgetState[]
  /** The id of the one Expanded Widget, always a Shown one; null if none. */
  expanded: string | null
}

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
      // Absent in layouts saved before Widget Settings existed.
      settings: z.record(z.string(), z.unknown()).optional(),
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
  snapshot: Pick<WidgetBoardSnapshot, "widgets">
) {
  const layout: SavedLayout = {
    version: STORAGE_VERSION,
    widgets: Object.fromEntries(
      snapshot.widgets.map(({ id, shown, position, settings }) => [
        id,
        { shown, position, settings },
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

/** Valid Widget Settings for `widget`, or `undefined` if they aren't. */
function parseSettings(
  widget: BoardWidget,
  settings: unknown
): WidgetSettings | undefined {
  if (!widget.settingsSchema) return {}
  const parsed = widget.settingsSchema.safeParse(settings)
  return parsed.success ? parsed.data : undefined
}

function defaultSettings(widget: BoardWidget): WidgetSettings {
  return parseSettings(widget, {}) ?? {}
}

function sameSettings(a: WidgetSettings, b: WidgetSettings) {
  return JSON.stringify(a) === JSON.stringify(b)
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

/**
 * Where a Widget goes at the Spot: its place there, or if a `taken` place is
 * in the way, stacked below it, or above it at the bottom Spots, until free.
 */
function stackedSpotPlace(
  spot: Spot,
  taken: PixelRect[],
  viewport: Size,
  widget: Size
): PixelPosition {
  const upwards = spot.endsWith("bottom")
  const place = toPixels(spotPosition(spot, viewport, widget), viewport)
  for (let tries = 0; tries < taken.length; tries++) {
    const other = taken.find((rect) => overlaps({ ...place, ...widget }, rect))
    if (!other) break
    place.top = upwards
      ? other.top - widget.height - STACK_GAP
      : other.top + other.height + STACK_GAP
  }
  return place
}

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

function overlaps(a: PixelRect, b: PixelRect) {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
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
  taken: PixelRect[],
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
    if (!taken.some((other) => overlaps({ ...place, ...widget }, other))) {
      break
    }
  }
  return place
}

export function createWidgetBoard(options: WidgetBoardOptions) {
  const { registry, storage, widgetSize, columnWidth, random } = options
  let viewport = options.viewport
  const listeners = new Set<() => void>()

  function sizeOf(id: string): Size {
    return registry.find((widget) => widget.id === id)?.size ?? widgetSize
  }

  /** Where the Shown Widgets other than `id` are, to keep clear of them. */
  function takenBy(others: WidgetState[], id: string): PixelRect[] {
    return others
      .filter((other) => other.id !== id && other.shown)
      .map((other) => ({
        ...toPixels(other.position, viewport),
        ...sizeOf(other.id),
      }))
  }

  /**
   * Before a Widget is ever placed: Shown, at its Starting Spot, or else at a
   * random free place in the margins, clear of the `others` already placed
   * either way, so a new Widget never lands on one the Owner already has.
   */
  function defaultState(
    widget: BoardWidget,
    others: WidgetState[]
  ): WidgetState {
    const size = sizeOf(widget.id)
    return {
      id: widget.id,
      shown: true,
      glide: false,
      settings: defaultSettings(widget),
      position: toPosition(
        widget.startingSpot
          ? stackedSpotPlace(
              widget.startingSpot,
              takenBy(others, widget.id),
              viewport,
              size
            )
          : randomMarginPlace(
              takenBy(others, widget.id),
              viewport,
              size,
              columnWidth,
              random
            ),
        viewport,
        size
      ),
    }
  }

  /** The same place, nudged so the whole Widget fits the current viewport. */
  function inView(id: string, position: WidgetPosition) {
    return toPosition(toPixels(position, viewport), viewport, sizeOf(id))
  }

  // Saved Widgets no longer in the registry are dropped; new ones get defaults.
  // A layout saved in a bigger window is pulled into this one. Saved Widgets
  // go first, then those with a Starting Spot, so new ones steer clear of them.
  const saved = loadLayout(storage)
  const order = (widget: BoardWidget) =>
    widget.id in saved ? 0 : widget.startingSpot !== undefined ? 1 : 2
  const placed: WidgetState[] = []
  for (const widget of [...registry].sort((a, b) => order(a) - order(b))) {
    const defaults = defaultState(widget, placed)
    const { settings, ...rest } = saved[widget.id] ?? {}
    const state = {
      ...defaults,
      ...rest,
      settings:
        (settings && parseSettings(widget, settings)) ?? defaults.settings,
    }
    placed.push({ ...state, position: inView(widget.id, state.position) })
  }
  let snapshot: WidgetBoardSnapshot = {
    widgets: registry.map((widget) =>
      placed.find((state) => state.id === widget.id)!
    ),
    // Never saved: every page load starts with all Widgets Collapsed.
    expanded: null,
  }
  // A random first place must not jump to another one on the next start.
  if (registry.some((widget) => !(widget.id in saved))) {
    saveLayout(storage, snapshot)
  }

  /**
   * Saves and notifies only if something actually changed. A Widget that ends
   * up Hidden can't stay Expanded.
   */
  function commit(widgets: WidgetState[], expanded = snapshot.expanded) {
    if (
      expanded !== null &&
      !widgets.some((w) => w.id === expanded && w.shown)
    ) {
      expanded = null
    }
    const moved = widgets.some((next, index) => {
      const current = snapshot.widgets[index]!
      return (
        next.shown !== current.shown ||
        next.glide !== current.glide ||
        next.position.x !== current.position.x ||
        next.position.y !== current.position.y ||
        !sameSettings(next.settings, current.settings)
      )
    })
    if (!moved && expanded === snapshot.expanded) return
    snapshot = { widgets, expanded }
    if (moved) saveLayout(storage, snapshot)
    for (const listener of listeners) listener()
  }

  /** Replaces one Widget's state; unknown ids and no-op changes do nothing. */
  function update(
    id: string,
    change: Partial<Omit<WidgetState, "id">>,
    expanded = snapshot.expanded
  ) {
    commit(
      snapshot.widgets.map((widget) =>
        widget.id === id ? { ...widget, ...change } : widget
      ),
      expanded
    )
  }

  /** Shows an Expandable Widget Expanded, Collapsing any other. */
  function expand(id: string) {
    const widget = registry.find((entry) => entry.id === id)
    if (!widget?.expandable) return
    update(id, { shown: true }, id)
  }

  function collapse() {
    commit(snapshot.widgets, null)
  }

  /**
   * Replaces the Widget's Settings when `settings` are valid for it; invalid
   * ones are ignored, so the Widget keeps the ones it had.
   */
  function withSettings(id: string, settings: unknown) {
    const widget = registry.find((entry) => entry.id === id)
    const parsed = widget && parseSettings(widget, settings)
    return parsed ? { settings: parsed } : {}
  }

  /** Shows the Widget, with new Widget Settings if given and valid. */
  function show(id: string, settings?: unknown) {
    update(id, {
      shown: true,
      ...(settings === undefined ? {} : withSettings(id, settings)),
    })
  }

  /** Shows the Widget at the Spot, stacked clear of the Shown Widgets there. */
  function moveToSpot(id: string, spot: Spot) {
    if (!snapshot.widgets.some((widget) => widget.id === id)) return
    const size = sizeOf(id)
    const place = stackedSpotPlace(
      spot,
      takenBy(snapshot.widgets, id),
      viewport,
      size
    )
    update(
      id,
      { shown: true, glide: true, position: toPosition(place, viewport, size) },
      // Collapses there, so the Owner sees it move.
      snapshot.expanded === id ? null : snapshot.expanded
    )
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    show,
    hide: (id: string) => update(id, { shown: false }),
    /** Replaces the Widget Settings; empty ones give back the defaults. */
    updateSettings: (id: string, settings: unknown) =>
      update(id, withSettings(id, settings)),
    /** A Turn's Widget changes, in order; unknown ids are skipped. */
    applyChanges(changes: readonly WidgetChange[]) {
      for (const change of changes) {
        switch (change.type) {
          case "show":
            show(change.id, change.settings)
            break
          case "hide":
            update(change.id, { shown: false })
            break
          case "move":
            moveToSpot(change.id, change.spot)
            break
          case "expand":
            expand(change.id)
            break
          case "collapse":
            collapse()
            break
        }
      }
    },
    /** What Jarvis is told about the layout each Turn. */
    describeLayout(): WidgetLayout {
      return snapshot.widgets.map(({ id, shown, position, settings }) => ({
        id,
        name: registry.find((widget) => widget.id === id)?.name ?? id,
        shown,
        expanded: id === snapshot.expanded,
        spot: nearestSpot(toPixels(position, viewport), viewport, sizeOf(id)),
        settings,
      }))
    },
    moveToSpot,
    expand,
    /** Collapses the Expanded Widget, if any, back to its place. */
    collapse,
    /** The Owner dragged a Widget's top-left corner to `to`; never the Expanded one. */
    drag(id: string, to: PixelPosition) {
      if (id === snapshot.expanded) return
      update(id, {
        position: toPosition(to, viewport, sizeOf(id)),
        glide: false,
      })
    },
    /** The window changed size; every Widget is kept fully inside it. */
    resize(next: Size) {
      viewport = next
      commit(
        snapshot.widgets.map((widget) => ({
          ...widget,
          position: inView(widget.id, widget.position),
          glide: false,
        }))
      )
    },
  }
}

export type WidgetBoard = ReturnType<typeof createWidgetBoard>
