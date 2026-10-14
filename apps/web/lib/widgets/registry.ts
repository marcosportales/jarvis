import type { ComponentType } from "react"

import type { WidgetSettings } from "./board"

import { WeatherWidget } from "@/components/widgets/weather-widget"

import { WIDGET_CATALOG, type WidgetId, type WidgetInfo } from "./catalog"

/** What every Widget component is given by the Widget layer. */
export type WidgetProps = {
  /** Its current Widget Settings, already valid for its schema. */
  settings: WidgetSettings
  /** Replaces its Widget Settings; empty ones give back the defaults. */
  updateSettings(settings: WidgetSettings): void
}

export type WidgetDefinition = WidgetInfo & {
  component: ComponentType<WidgetProps>
}

const COMPONENTS: Record<WidgetId, ComponentType<WidgetProps>> = {
  weather: WeatherWidget,
}

/**
 * The only place a Widget is declared: its entry in `WIDGET_CATALOG` plus its
 * component here.
 */
export const WIDGETS: readonly WidgetDefinition[] = WIDGET_CATALOG.map(
  (widget) => ({ ...widget, component: COMPONENTS[widget.id] })
)
