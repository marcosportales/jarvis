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
    id: "today",
    name: "Hoy",
    description:
      "La fecha de hoy con el día de la semana y la hora, donde está el dueño.",
    startingSpot: "right-top",
    source: "built-in",
  },
  {
    id: "weather",
    name: "Tiempo",
    description:
      "El tiempo actual: temperatura, estado del cielo, máxima y mínima de hoy y viento.",
    // Just below the Today Widget.
    startingSpot: "right-middle",
    source: "built-in",
    settingsSchema: weatherSettingsSchema,
  },
  {
    id: "results",
    name: "Resultados",
    description:
      "Lo que encontró la última búsqueda: una tarjeta por resultado con sus datos clave y un enlace para abrirlo.",
    startingSpot: "left-top",
    source: "built-in",
    // Larger than the Weather Widget so a list fits; it scrolls inside.
    size: { width: 336, height: 440 },
    expandable: true,
  },
  {
    id: "browser",
    name: "Navegador",
    description:
      "La navegación actual en directo: la pantalla del navegador remoto, qué se pidió, qué hace ahora, un botón para pararla y, al terminar, lo que encontró.",
    startingSpot: "left-middle",
    source: "built-in",
    // A 16:10 screen across the card, plus what was asked and a status line.
    size: { width: 400, height: 420 },
    expandable: true,
  },
] as const satisfies readonly WidgetInfo[]

export type WidgetId = (typeof WIDGET_CATALOG)[number]["id"]

/** The Results Widget, which the Turn Shows on its own after a list Search. */
export const RESULTS_WIDGET_ID = "results" satisfies WidgetId

/** The Browser Widget, which the Turn Shows on its own when a Browse Task starts. */
export const BROWSER_WIDGET_ID = "browser" satisfies WidgetId
