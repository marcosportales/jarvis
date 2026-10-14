import {
  createWidgetBoard,
  type Size,
  type WidgetBoard,
  type WidgetBoardStorage,
} from "./board"
import { WIDGETS } from "./registry"

/** Matches the Widget card's width; height is the Weather Widget's usual one. */
export const WIDGET_SIZE: Size = { width: 256, height: 168 }

/** The Jarvis page's orb and Transcript column (`max-w-2xl`). */
const JARVIS_COLUMN_WIDTH = 672

/** Blocked storage (e.g. some private modes) just means nothing is remembered. */
const browserStorage: WidgetBoardStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => window.localStorage.setItem(key, value),
}

let board: WidgetBoard | undefined

function viewport(): Size {
  return { width: window.innerWidth, height: window.innerHeight }
}

/** One Widget Board per tab, shared by the Jarvis page and the sidebar. Browser only. */
export function getWidgetBoard(): WidgetBoard {
  if (!board) {
    const created = createWidgetBoard({
      registry: WIDGETS,
      storage: browserStorage,
      viewport: viewport(),
      widgetSize: WIDGET_SIZE,
      columnWidth: JARVIS_COLUMN_WIDTH,
      random: Math.random,
    })
    // Lives as long as the tab, like the Board itself.
    window.addEventListener("resize", () => created.resize(viewport()))
    board = created
  }
  return board
}
