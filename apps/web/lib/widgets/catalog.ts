import { z } from "zod"

import type { BoardWidget } from "./board"

/** Built into Jarvis; Plugin Widgets (MCP Apps, ADR 0003) come later. */
export type WidgetSource = "built-in"

/**
 * What the server may know about a Widget: everything but its component, so
 * Jarvis's tools can be built from it without importing React.
 */
export type WidgetInfo = BoardWidget & {
  /** Spanish, shown to the Owner. */
  name: string
  /** One line on what it shows, written for the model. */
  description: string
  source: WidgetSource
}

/** No place means the Owner's location. */
export const weatherSettingsSchema = z.object({
  place: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "El lugar que muestra, por ejemplo «Londres». Sin place, muestra la ubicación del dueño."
    ),
})

export type WeatherSettings = z.infer<typeof weatherSettingsSchema>

/** Every Widget; the client registry adds each one's component. */
export const WIDGET_CATALOG = [
  {
    id: "weather",
    name: "Tiempo",
    description:
      "El tiempo actual: temperatura, estado del cielo, máxima y mínima de hoy y viento.",
    startingSpot: "right-top",
    source: "built-in",
    settingsSchema: weatherSettingsSchema,
  },
] as const satisfies readonly WidgetInfo[]

export type WidgetId = (typeof WIDGET_CATALOG)[number]["id"]
