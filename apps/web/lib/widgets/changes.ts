import { z } from "zod"

import { SPOTS, type Spot, type WidgetSettings } from "./board"

/**
 * What a Turn did to the Widgets. Jarvis's tools record these on the server
 * and the Session applies them to the Widget Board when the Reply arrives.
 */
export type WidgetChange =
  /** With `settings`, they replace the Widget's; without, it keeps its own. */
  | { type: "show"; id: string; settings?: WidgetSettings }
  | { type: "hide"; id: string }
  | { type: "move"; id: string; spot: Spot }
  /** Shows the Widget Expanded, if it is Expandable. */
  | { type: "expand"; id: string }
  /** Collapses whichever Widget is Expanded. */
  | { type: "collapse" }

/** The change names that Widget; a collapse names none. */
export function changesWidget(change: WidgetChange, id: string) {
  return "id" in change && change.id === id
}

/** One Widget as Jarvis is told about it each Turn. */
export type WidgetLayoutEntry = {
  id: string
  name: string
  shown: boolean
  expanded: boolean
  /** The Spot nearest to where it is, even after the Owner dragged it. */
  spot: Spot
  settings: WidgetSettings
}

/** Every Widget in registry order, sent with each Turn. */
export type WidgetLayout = WidgetLayoutEntry[]

export const widgetLayoutSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    shown: z.boolean(),
    expanded: z.boolean(),
    spot: z.enum(SPOTS),
    settings: z.record(z.string(), z.unknown()),
  })
)
