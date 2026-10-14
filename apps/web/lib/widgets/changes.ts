import { z } from "zod"

/**
 * What a Turn did to the Widgets. Jarvis's tools record these on the server
 * and the Session applies them to the Widget Board when the Reply arrives.
 */
export type WidgetChange =
  { type: "show"; id: string } | { type: "hide"; id: string }

/** One Widget as Jarvis is told about it each Turn. */
export type WidgetLayoutEntry = { id: string; name: string; shown: boolean }

/** Every Widget in registry order, sent with each Turn. */
export type WidgetLayout = WidgetLayoutEntry[]

export const widgetLayoutSchema = z.array(
  z.object({ id: z.string(), name: z.string(), shown: z.boolean() })
)
