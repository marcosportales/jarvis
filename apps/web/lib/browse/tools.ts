import { tool, type ToolSet } from "ai"
import { z } from "zod"

import type { Browse } from "./browse"
import { domainOf, type BrowseView } from "./view"

export const BROWSE_STARTED =
  "Navegación iniciada. Dilo en una sola frase y remite al navegador en pantalla; no hables del resultado hasta que te lo pregunten."

export const BROWSE_START_FAILED =
  "No he podido empezar a mirarlo en la web. Dilo en una frase; no inventes la respuesta."

export const NOTHING_TO_STOP =
  "No había ninguna navegación en curso. Dilo con naturalidad."

export const BROWSE_STOP_FAILED =
  "No he podido parar la navegación. Dilo en una frase."

/** Jarvis's Browse tools for one Turn, and whether one started. */
export type BrowseTurnTools = {
  tools: ToolSet
  /** A Browse Task started in this Turn. */
  started(): boolean
}

export function createBrowseTools({
  browse,
}: {
  browse: Pick<Browse, "start" | "stop">
}): BrowseTurnTools {
  let started = false

  return {
    tools: {
      start_browse: tool({
        description:
          "Empieza una navegación: un navegador remoto busca en webs reales, por su cuenta y solo leyendo, lo que la búsqueda no encontró. Tarda minutos, pero tu respuesta no espera a que termine. Llámala solo si el dueño aceptó tu propuesta en este turno o en el anterior, o si te lo pidió directamente («mira en la web de Renfe…»). Para la navegación en curso, si la hay.",
        inputSchema: z.object({
          task: z
            .string()
            .trim()
            .min(10)
            .describe(
              "Qué buscar, completo y sin depender de la conversación: el sitio, las fechas, los lugares y los datos que hay que traer. Solo leer: nunca le pidas iniciar sesión, reservar, comprar ni simular una reserva o una compra, ni le des contraseñas ni datos del dueño."
            ),
          startUrl: z
            .url()
            .optional()
            .describe("La web donde empezar, si sabes cuál es."),
        }),
        execute: async ({ task, startUrl }) => {
          try {
            const { stopped } = await browse.start({ task, startUrl })
            started = true
            return stopped
              ? `Paré la navegación anterior («${stopped.task}») para empezar esta. Dilo también. ${BROWSE_STARTED}`
              : BROWSE_STARTED
          } catch (error) {
            console.error("Starting a Browse Task failed", error)
            return BROWSE_START_FAILED
          }
        },
      }),
      stop_browse: tool({
        description:
          "Para la navegación en curso, por ejemplo cuando el dueño dice «para» o «déjalo».",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const stopped = await browse.stop()
            return stopped
              ? `Navegación parada: «${stopped.task}». Confírmalo en una frase.`
              : NOTHING_TO_STOP
          } catch (error) {
            console.error("Stopping the Browse Task failed", error)
            return BROWSE_STOP_FAILED
          }
        },
      }),
    },
    started: () => started,
  }
}

/** "hace 3 minutos", whole minutes, never less than one. */
function ago(from: Date, now: Date) {
  const minutes = Math.max(
    1,
    Math.round((now.getTime() - from.getTime()) / 60_000)
  )
  return minutes === 1 ? "hace 1 minuto" : `hace ${minutes} minutos`
}

const ENDED: Record<Exclude<BrowseView["status"], "running">, string> = {
  finished: "Terminó",
  failed: "Falló",
  stopped: "Se paró antes de terminar",
  "timed-out": "Se paró por tardar demasiado",
}

/**
 * What Jarvis is told each Turn about the current Browse Task, so it can
 * answer «¿cómo va?» and «¿qué has encontrado?». Null with no Browse Task.
 */
export function browseNotice(view: BrowseView | null, now: Date) {
  if (!view) return null
  if (view.status === "running") {
    const where = domainOf(view.currentUrl)
    const doing = view.currentGoal
      ? `Lo último que hace (en inglés; tradúcelo): «${view.currentGoal}»${where ? ` en ${where}` : ""}.`
      : where
        ? `Está en ${where}.`
        : "Aún está empezando."
    return [
      `Navegación en curso, empezada ${ago(view.startedAt, now)}: «${view.task}».`,
      doing,
      "Si preguntan cómo va, cuéntalo en una frase; el resultado llegará al navegador en pantalla.",
    ].join("\n")
  }
  const outcome =
    view.status === "finished" && view.success === false
      ? "Terminó sin conseguirlo del todo"
      : ENDED[view.status]
  return [
    `Última navegación: «${view.task}». ${outcome}${view.endedAt ? ` ${ago(view.endedAt, now)}` : ""}.`,
    view.outcome ? `Resultado: «${view.outcome}»` : "No dejó ningún resultado.",
    view.currentUrl
      ? `Acabó en ${domainOf(view.currentUrl) ?? view.currentUrl}.`
      : null,
    "Responde desde aquí solo cuando el dueño pregunte qué encontró; nunca inventes lo que no diga. Para saber más habría que empezar otra navegación.",
  ]
    .filter((line) => line !== null)
    .join("\n")
}
