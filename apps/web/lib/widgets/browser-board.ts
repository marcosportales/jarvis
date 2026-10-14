import {
  createWidgetBoard,
  type Size,
  type WidgetBoard,
  type WidgetBoardStorage,
} from "./board"
import { WIDGETS } from "./registry"

/** Matches the Widget card's width; height is the Weather Widget's usual one. */
export const WIDGET_SIZE: Size = { width: 256, height: 168 }

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

/** One Widget Board per tab, shared by the Jarvis page and the sidebar. Browser only. */
export function getWidgetBoard(): WidgetBoard {
  board ??= createWidgetBoard({
    registry: WIDGETS,
    storage: browserStorage,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    widgetSize: WIDGET_SIZE,
    random: Math.random,
  })
  return board
}
