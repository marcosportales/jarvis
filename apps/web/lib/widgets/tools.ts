import { tool, type ToolSet } from "ai"
import { z } from "zod"

import type { WidgetInfo } from "./catalog"
import type { WidgetChange, WidgetLayout } from "./changes"

/** Jarvis's Widget tools for one Turn, and the Widget changes they made. */
export type WidgetTurnTools = {
  tools: ToolSet
  /** In the order the tools were called. */
  changes(): WidgetChange[]
}

function catalogLines(catalog: readonly WidgetInfo[]) {
  return catalog
    .map(({ id, name, description }) => `- ${id} (${name}): ${description}`)
    .join("\n")
}

/**
 * Generated from the Widget registry, so a new Widget needs no new tool. Each
 * call records a Widget change for the Reply; nothing changes on screen until
 * the Session applies them.
 */
export function createWidgetTools(
  catalog: readonly WidgetInfo[]
): WidgetTurnTools {
  const changes: WidgetChange[] = []
  const widgets = catalogLines(catalog)
  const ids = catalog.map(({ id }) => id).join(", ")
  const idInput = z.object({
    id: z.string().describe(`El id del widget: ${ids}.`),
  })

  /** Unknown ids become an answer for the model, never a thrown error. */
  function record(change: WidgetChange, done: (name: string) => string) {
    const widget = catalog.find(({ id }) => id === change.id)
    if (!widget) {
      return `El widget «${change.id}» no existe. Los widgets disponibles son: ${ids}.`
    }
    changes.push(change)
    return done(widget.name)
  }

  return {
    tools: {
      show_widget: tool({
        description: `Muestra un widget en la pantalla del dueño.\nWidgets disponibles:\n${widgets}`,
        inputSchema: idInput,
        execute: async ({ id }) =>
          record({ type: "show", id }, (name) => `Widget ${name} mostrado.`),
      }),
      hide_widget: tool({
        description: `Oculta un widget de la pantalla del dueño.\nWidgets disponibles:\n${widgets}`,
        inputSchema: idInput,
        execute: async ({ id }) =>
          record({ type: "hide", id }, (name) => `Widget ${name} ocultado.`),
      }),
    },
    changes: () => [...changes],
  }
}

/** Tells the model what the Owner sees right now, for the system prompt. */
export function widgetLayoutNotice(layout: WidgetLayout) {
  if (layout.length === 0) return "El dueño no tiene widgets."
  const lines = layout.map(
    ({ id, name, shown }) =>
      `- ${id} (${name}): ${shown ? "visible" : "oculto"}`
  )
  return `Widgets del dueño ahora mismo:\n${lines.join("\n")}`
}
