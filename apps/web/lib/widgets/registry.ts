import type { ComponentType } from "react"

import type { WidgetSettings } from "./board"

import { BrowserWidget } from "@/components/widgets/browser-widget"
import { ResultsWidget } from "@/components/widgets/results-widget"
import { TodayWidget } from "@/components/widgets/today-widget"
import { WeatherWidget } from "@/components/widgets/weather-widget"

import { WIDGET_CATALOG, type WidgetId, type WidgetInfo } from "./catalog"

/** What every Widget component is given by the Widget layer. */
export type WidgetProps = {
  /** Its current Widget Settings, already valid for its schema. */
  settings: WidgetSettings
  /** Replaces its Widget Settings; empty ones give back the defaults. */
  updateSettings(settings: WidgetSettings): void
  /** Shown large in the middle of the page, with room to arrange itself. */
  expanded: boolean
}

export type WidgetDefinition = WidgetInfo & {
  component: ComponentType<WidgetProps>
}

const COMPONENTS: Record<WidgetId, ComponentType<WidgetProps>> = {
  today: TodayWidget,
  weather: WeatherWidget,
  results: ResultsWidget,
  browser: BrowserWidget,
}

/**
 * The only place a Widget is declared: its entry in `WIDGET_CATALOG` plus its
 * component here.
 */
export const WIDGETS: readonly WidgetDefinition[] = WIDGET_CATALOG.map(
  (widget) => ({ ...widget, component: COMPONENTS[widget.id] })
)
