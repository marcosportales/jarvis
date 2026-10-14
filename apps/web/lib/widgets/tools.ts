import { tool, type ToolSet } from "ai"
import { z } from "zod"

import { SPOTS, type Spot } from "./board"
import type { WidgetInfo } from "./catalog"
import type { WidgetChange, WidgetLayout } from "./changes"

/** Jarvis's Widget tools for one Turn, and the Widget changes they made. */
export type WidgetTurnTools = {
  tools: ToolSet
  /** In the order the tools were called. */
  changes(): WidgetChange[]
}

/** How Jarvis should say each Spot to the Owner. */
const SPOT_NAMES: Record<Spot, string> = {
  "left-top": "arriba a la izquierda",
  "left-middle": "a la izquierda en medio",
  "left-bottom": "abajo a la izquierda",
  "right-top": "arriba a la derecha",
  "right-middle": "a la derecha en medio",
  "right-bottom": "abajo a la derecha",
}

const spotLines = SPOTS.map((spot) => `- ${spot}: ${SPOT_NAMES[spot]}`).join(
  "\n"
)

function isSpot(value: string): value is Spot {
  return (SPOTS as readonly string[]).includes(value)
}

function catalogLines(catalog: readonly WidgetInfo[]) {
  return catalog
    .map(({ id, name, description }) => `- ${id} (${name}): ${description}`)
    .join("\n")
}

/** Each Widget's Widget Settings as JSON Schema, so the model knows them. */
function settingsLines(catalog: readonly WidgetInfo[]) {
  return catalog
    .map(({ id, settingsSchema }) =>
      settingsSchema
        ? `- ${id}: ${JSON.stringify(z.toJSONSchema(settingsSchema, { io: "input" }))}`
        : `- ${id}: sin ajustes`
    )
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
  const expandable = catalog.filter((widget) => widget.expandable)
  const expandableIds = expandable.map(({ id }) => id).join(", ") || "ninguno"
  const idInput = z.object({
    id: z.string().describe(`El id del widget: ${ids}.`),
  })

  /** Unknown ids become an answer for the model, never a thrown error. */
  function record(
    change: Extract<WidgetChange, { id: string }>,
    done: (name: string) => string
  ) {
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
        description: `Muestra un widget en la pantalla del dueño. Con \`settings\` cambia sus ajustes, que sustituyen a los que tenía; sin \`settings\` conserva los suyos.\nWidgets disponibles:\n${widgets}\nAjustes de cada widget:\n${settingsLines(catalog)}`,
        inputSchema: idInput.extend({
          settings: z
            .record(z.string(), z.unknown())
            .optional()
            .describe("Los nuevos ajustes del widget, según su esquema."),
        }),
        execute: async ({ id, settings }) => {
          if (settings === undefined) {
            return record(
              { type: "show", id },
              (name) => `Widget ${name} mostrado.`
            )
          }
          const widget = catalog.find((entry) => entry.id === id)
          if (widget && !widget.settingsSchema) {
            if (Object.keys(settings).length > 0) {
              return `El widget «${id}» no tiene ajustes; muéstralo sin \`settings\`.`
            }
          } else if (widget?.settingsSchema) {
            const parsed = widget.settingsSchema.safeParse(settings)
            if (!parsed.success) {
              return `Los ajustes ${JSON.stringify(settings)} no son válidos para el widget «${id}»: ${z.prettifyError(parsed.error)}`
            }
          }
          return record(
            { type: "show", id, settings },
            (name) =>
              `Widget ${name} mostrado con ajustes ${JSON.stringify(settings)}.`
          )
        },
      }),
      hide_widget: tool({
        description: `Oculta un widget de la pantalla del dueño. Si está ampliado y piden cerrarlo, usa collapse_widget en su lugar.\nWidgets disponibles:\n${widgets}`,
        inputSchema: idInput,
        execute: async ({ id }) =>
          record({ type: "hide", id }, (name) => `Widget ${name} ocultado.`),
      }),
      move_widget: tool({
        description: `Mueve un widget a un sitio de la pantalla del dueño; si estaba oculto, también lo muestra. Si el sitio ya tiene otro widget, se coloca junto a él. Si es el widget ampliado, se reduce en su nuevo sitio.\nSitios:\n${spotLines}\nWidgets disponibles:\n${widgets}`,
        inputSchema: idInput.extend({
          spot: z.enum(SPOTS).describe("El sitio al que moverlo."),
        }),
        execute: async ({ id, spot }) => {
          if (!isSpot(spot)) {
            return `El sitio «${spot}» no existe. Los sitios son: ${SPOTS.join(", ")}.`
          }
          return record(
            { type: "move", id, spot },
            (name) => `Widget ${name} movido ${SPOT_NAMES[spot]}.`
          )
        },
      }),
      expand_widget: tool({
        description: `Amplía un widget: lo muestra grande en el centro de la pantalla del dueño, sobre lo demás; si estaba oculto, también lo muestra. Solo puede haber uno ampliado, así que ampliar otro reduce el anterior. Úsalo solo cuando el dueño lo pida, nunca por tu cuenta.\nWidgets que se pueden ampliar:\n${catalogLines(expandable)}`,
        inputSchema: z.object({
          id: z
            .string()
            .describe(`El id del widget que ampliar: ${expandableIds}.`),
        }),
        execute: async ({ id }) => {
          const widget = catalog.find((entry) => entry.id === id)
          if (widget && !widget.expandable) {
            return `El widget ${widget.name} no se puede ampliar. Los que se pueden ampliar son: ${expandableIds}.`
          }
          return record(
            { type: "expand", id },
            (name) => `Widget ${name} ampliado.`
          )
        },
      }),
      collapse_widget: tool({
        description:
          "Reduce el widget ampliado: vuelve a su sitio de siempre y sigue visible. Mientras hay uno ampliado, «ciérralo», «quítalo» o «hazlo pequeño» se refieren a esto, no a ocultarlo.",
        inputSchema: z.object({}),
        execute: async () => {
          changes.push({ type: "collapse" })
          return "Widget reducido."
        },
      }),
    },
    changes: () => [...changes],
  }
}

/** Tells the model what the Owner sees right now, for the system prompt. */
export function widgetLayoutNotice(layout: WidgetLayout) {
  if (layout.length === 0) return "El dueño no tiene widgets."
  const lines = layout.map(
    ({ id, name, shown, expanded, spot, settings }) =>
      `- ${id} (${name}): ${shown ? "visible" : "oculto"}${expanded ? ", ampliado," : ","} en ${spot} (${SPOT_NAMES[spot]}), ajustes ${JSON.stringify(settings)}`
  )
  return `Widgets del dueño ahora mismo:\n${lines.join("\n")}`
}
