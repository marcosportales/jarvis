import { z } from "zod"

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
export type BoardWidget = { id: string; startingSpot?: Spot }

export type Size = { width: number; height: number }

/** Top-left corner as fractions of the viewport, so it survives resizes. */
export type WidgetPosition = { x: number; y: number }

export type WidgetState = {
  id: string
  shown: boolean
  position: WidgetPosition
}

/** Widgets in registry order. */
export type WidgetBoardSnapshot = { widgets: WidgetState[] }

export type WidgetBoardOptions = {
  registry: readonly BoardWidget[]
  storage: WidgetBoardStorage
  viewport: Size
  widgetSize: Size
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

/** Space kept between a Widget at a Spot and the window's edges. */
const EDGE_GAP = 16

function spotPosition(spot: Spot, viewport: Size, widget: Size) {
  const [side, row] = spot.split("-") as [string, string]
  const left =
    side === "left" ? EDGE_GAP : viewport.width - widget.width - EDGE_GAP
  const top =
    row === "top"
      ? EDGE_GAP
      : row === "middle"
        ? (viewport.height - widget.height) / 2
        : viewport.height - widget.height - EDGE_GAP
  return { x: left / viewport.width, y: top / viewport.height }
}

export function createWidgetBoard(options: WidgetBoardOptions) {
  const { registry, storage, viewport, widgetSize } = options
  const listeners = new Set<() => void>()

  /** Before a Widget is ever placed: Shown, at its Starting Spot. */
  function defaultState(widget: BoardWidget): WidgetState {
    return {
      id: widget.id,
      shown: true,
      position: spotPosition(
        widget.startingSpot ?? "right-top",
        viewport,
        widgetSize
      ),
    }
  }

  // Saved Widgets no longer in the registry are dropped; new ones get defaults.
  const saved = loadLayout(storage)
  let snapshot: WidgetBoardSnapshot = {
    widgets: registry.map((widget) => ({
      ...defaultState(widget),
      ...saved[widget.id],
    })),
  }

  /** Replaces one Widget's state; unknown ids and no-op changes do nothing. */
  function update(id: string, change: Partial<Omit<WidgetState, "id">>) {
    const current = snapshot.widgets.find((widget) => widget.id === id)
    if (!current) return
    const next = { ...current, ...change }
    if (next.shown === current.shown && next.position === current.position) {
      return
    }
    snapshot = {
      widgets: snapshot.widgets.map((widget) =>
        widget.id === id ? next : widget
      ),
    }
    saveLayout(storage, snapshot)
    for (const listener of listeners) listener()
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
  }
}

export type WidgetBoard = ReturnType<typeof createWidgetBoard>
