import type { ComponentType } from "react"

import { WeatherWidget } from "@/components/widgets/weather-widget"

import type { BoardWidget } from "./board"

/** Built into Jarvis; Plugin Widgets (MCP Apps, ADR 0003) come later. */
export type WidgetSource = "built-in"

export type WidgetDefinition = BoardWidget & {
  /** Spanish, shown to the Owner. */
  name: string
  /** One line on what it shows, written for the model. */
  description: string
  source: WidgetSource
  component: ComponentType
}

/** The only place a Widget is declared. A new Widget only needs an entry here. */
export const WIDGETS: readonly WidgetDefinition[] = [
  {
    id: "weather",
    name: "Tiempo",
    description:
      "El tiempo actual: temperatura, estado del cielo, máxima y mínima de hoy y viento.",
    startingSpot: "right-top",
    source: "built-in",
    component: WeatherWidget,
  },
]
