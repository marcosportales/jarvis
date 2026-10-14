import { tool, type ToolSet } from "ai"
import { z } from "zod"

import { mapPage, mapWeb } from "./mappers"
import type { SearchOutcome, SearchResult } from "./outcome"
import type { SearchPort, SearchSlug } from "./port"

/** How much of a page `read_page` asks Composio for. */
const PAGE_CHARACTERS = 6_000

/** Spoken by the model when Search fails; it then answers from what it knows. */
export const SEARCH_FAILED =
  "No he podido buscar ahora mismo. Dilo en una frase y responde con lo que sepas, avisando de que puede no estar al día."

export const SEARCH_EMPTY =
  "La búsqueda no encontró nada. Dilo con naturalidad; no inventes nada."

export const PAGE_UNREADABLE =
  "No he podido leer esa página. Dilo en una frase; no inventes su contenido."

/** Jarvis's Search tools for one Turn, and what they found. */
export type SearchTurnTools = {
  tools: ToolSet
  /**
   * The Turn's latest Search Outcome: the last one with Results, or else the
   * last one. None if the Turn didn't search or every Search failed.
   */
  outcome(): SearchOutcome | undefined
}

function resultLine({ title, subtitle, facts, source, url }: SearchResult) {
  return [
    subtitle ? `${title} — ${subtitle}.` : `${title}.`,
    ...facts.map(({ label, value }) => `${label}: ${value}.`),
    source ? `Fuente: ${source}.` : "",
    url ? `Enlace (para read_page, no lo digas): ${url}` : "",
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * Plain numbered lines for the model, in the weather tool's style. Links are
 * there so it can read a result's page, never to be said.
 */
export function describeOutcome(outcome: SearchOutcome) {
  const { kind, heading, results, answer } = outcome
  if (kind === "page") {
    if (!answer) return PAGE_UNREADABLE
    const source = results[0]?.source
    return [
      `Texto de la página «${heading}»${source ? ` (${source})` : ""}:`,
      answer,
    ].join("\n")
  }
  if (results.length === 0) return SEARCH_EMPTY
  return [
    `${heading}. ${results.length} resultados:`,
    ...results.map((result, i) => `${i + 1}. ${resultLine(result)}`),
    ...(answer
      ? [
          "Resumen del buscador, menos fiable que los resultados; contrástalo con ellos:",
          answer,
        ]
      : []),
  ].join("\n")
}

/**
 * Built-in like the weather: they call Composio Search through the port, map
 * the response to a Search Outcome and give the model plain lines. Failures
 * become an answer for the model, never a thrown error, so the Turn goes on.
 */
export function createSearchTools({
  search,
}: {
  search: SearchPort
}): SearchTurnTools {
  let latest: SearchOutcome | undefined

  function record(outcome: SearchOutcome) {
    // A later Search that found nothing doesn't hide an earlier one's Results.
    if (!latest || outcome.results.length > 0 || latest.results.length === 0) {
      latest = outcome
    }
  }

  async function run(
    slug: SearchSlug,
    args: Record<string, unknown>,
    map: (data: unknown) => SearchOutcome
  ) {
    let outcome: SearchOutcome
    try {
      outcome = map(await search.run(slug, args))
    } catch (error) {
      console.error(`Search ${slug} failed`, error)
      return SEARCH_FAILED
    }
    record(outcome)
    return describeOutcome(outcome)
  }

  return {
    tools: {
      search_web: tool({
        description:
          "Busca en la web pública información actual o que no sabes: noticias puntuales, horarios, precios, datos de empresas o lugares. Devuelve resultados numerados con su fuente.",
        inputSchema: z.object({
          query: z
            .string()
            .min(1)
            .describe(
              "Qué buscar, con los detalles que ayuden (lugar, año, nombre exacto)."
            ),
        }),
        execute: ({ query }) =>
          run("COMPOSIO_SEARCH_WEB", { query }, (data) =>
            mapWeb(data, { query })
          ),
      }),
      read_page: tool({
        description:
          "Lee el texto de una página web pública, por ejemplo el primer resultado de search_web cuando su título no basta para responder. Solo páginas web, no PDF ni imágenes.",
        inputSchema: z.object({
          url: z.string().url().describe("La dirección completa de la página."),
        }),
        execute: ({ url }) =>
          run(
            "COMPOSIO_SEARCH_FETCH_URL_CONTENT",
            { urls: [url], max_characters: PAGE_CHARACTERS },
            (data) => mapPage(data, { url })
          ),
      }),
    },
    outcome: () => latest,
  }
}
