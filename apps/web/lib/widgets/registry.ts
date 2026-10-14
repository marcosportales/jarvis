import type { ComponentType } from "react"

import { WeatherWidget } from "@/components/widgets/weather-widget"

import { WIDGET_CATALOG, type WidgetId, type WidgetInfo } from "./catalog"

export type WidgetDefinition = WidgetInfo & { component: ComponentType }

const COMPONENTS: Record<WidgetId, ComponentType> = {
  weather: WeatherWidget,
}

/**
 * The only place a Widget is declared: its entry in `WIDGET_CATALOG` plus its
 * component here.
 */
export const WIDGETS: readonly WidgetDefinition[] = WIDGET_CATALOG.map(
  (widget) => ({ ...widget, component: COMPONENTS[widget.id] })
)
