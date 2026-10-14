"use client"

import { useSyncExternalStore } from "react"

import type { WidgetBoardSnapshot } from "@/lib/widgets/board"
import { getWidgetBoard } from "@/lib/widgets/browser-board"

/** The server has no saved layout, so nothing renders until hydration. */
const SERVER_SNAPSHOT: WidgetBoardSnapshot = { widgets: [] }

const subscribe = (listener: () => void) => getWidgetBoard().subscribe(listener)
const getSnapshot = () => getWidgetBoard().getSnapshot()
const getServerSnapshot = () => SERVER_SNAPSHOT

/**
 * The current Widget layout of the tab's Widget Board. Change it through
 * `getWidgetBoard()` in event handlers.
 */
export function useWidgetLayout(): WidgetBoardSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
