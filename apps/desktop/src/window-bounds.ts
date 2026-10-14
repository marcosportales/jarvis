/** Where the Jarvis window is and how big, as Electron measures it. */
export type Bounds = { x?: number; y?: number; width: number; height: number }

export type Rectangle = { x: number; y: number; width: number; height: number }

export const DEFAULT_SIZE = { width: 1280, height: 860 }

/** Smaller than this, the Jarvis page isn't usable. */
const MIN_SIZE = { width: 400, height: 300 }

/**
 * The Jarvis window's saved bounds, or the default size when there are none
 * or they're unusable. A place off every screen (e.g. a monitor since
 * unplugged) is dropped, keeping the size, so the desktop places it.
 */
export function restoreBounds(
  saved: string | undefined,
  screens: Rectangle[]
): Bounds {
  let bounds: Partial<Record<keyof Rectangle, unknown>>
  try {
    bounds = JSON.parse(saved ?? "null") ?? {}
  } catch {
    return DEFAULT_SIZE
  }
  const { x, y, width, height } = bounds
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    width < MIN_SIZE.width ||
    height < MIN_SIZE.height
  ) {
    return DEFAULT_SIZE
  }
  if (typeof x !== "number" || typeof y !== "number") return { width, height }
  const window = { x, y, width, height }
  return screens.some((screen) => overlap(window, screen))
    ? window
    : { width, height }
}

function overlap(a: Rectangle, b: Rectangle) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  )
}
