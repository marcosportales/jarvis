import { tool, type ToolSet } from "ai"
import { z } from "zod"

import {
  mapEvents,
  mapFlights,
  mapHotels,
  mapNews,
  mapPage,
  mapPlaces,
  mapWeb,
} from "./mappers"
import {
  isList,
  type ResultsOnScreen,
  type SearchOutcome,
  type SearchResult,
} from "./outcome"
import type { SearchPort, SearchSlug } from "./port"

/** How much of a page `read_page` asks Composio for. */
const PAGE_CHARACTERS = 6_000

/** Results in Spanish, for Spain, unless the Owner names another country. */
function region(country: string | undefined) {
  return { hl: "es", gl: country?.toLowerCase() ?? "es" }
}

const currencyInput = z
  .string()
  .regex(/^[A-Za-z]{3}$/)
  .default("EUR")
  .transform((currency) => currency.toUpperCase())
  .describe(
    "Moneda, en código ISO de tres letras. EUR salvo que el dueño pida otra («en dólares» es USD)."
  )

const countryInput = z
  .string()
  .regex(/^[A-Za-z]{2}$/)
  .optional()
  .describe(
    "País de los resultados, en código ISO de dos letras, solo si el dueño pide otro; por defecto, España."
  )

const dayInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const iataInput = z
  .string()
  .regex(/^[A-Za-z]{3}$/)
  .transform((code) => code.toUpperCase())

/** Composio's `travel_class` numbers. */
const CABIN_CLASSES = {
  turista: 1,
  "turista-premium": 2,
  business: 3,
  primera: 4,
} as const

const passengersInput = (who: string, fallback: number) =>
  z.number().int().min(0).max(9).default(fallback).describe(who)

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
   * last one. A list wins over the sources read for it, so reading one of a
   * list's pages doesn't replace the list. None if the Turn didn't search or
   * every Search failed.
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
 * Tells the model what the Results Widget shows, numbered as on screen, so
 * "¿y el segundo?" needs no new Search. Nothing on screen, no notice.
 */
export function resultsOnScreenNotice(results: ResultsOnScreen | undefined) {
  if (!results) return null
  const lines = results.results.map(
    (result, i) => `${i + 1}. ${resultLine(result)}`
  )
  return [
    `Resultados en pantalla ahora mismo, en el widget Resultados: «${results.heading}».`,
    ...(lines.length > 0 ? lines : ["La búsqueda no encontró nada."]),
    "Si el dueño pregunta por ellos («¿y el segundo?», «¿cuál es el más barato?»), responde con estos datos sin volver a buscar.",
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
  let latestList: SearchOutcome | undefined
  let latestSources: SearchOutcome | undefined

  /** A later Search that found nothing doesn't hide an earlier one's Results. */
  function newer(latest: SearchOutcome | undefined, outcome: SearchOutcome) {
    return !latest || outcome.results.length > 0 || latest.results.length === 0
      ? outcome
      : latest
  }

  function record(outcome: SearchOutcome) {
    if (isList(outcome)) latestList = newer(latestList, outcome)
    else latestSources = newer(latestSources, outcome)
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
      search_flights: tool({
        description:
          "Busca vuelos entre dos aeropuertos en una fecha, de ida o de ida y vuelta, con precios, horarios, duración y escalas. Los lugares van como códigos IATA de aeropuerto o de ciudad (Madrid MAD, Roma FCO o ROM, Londres LON, Lisboa LIS); tradúcelos tú a partir de lo que diga el dueño.",
        inputSchema: z.object({
          from: iataInput.describe(
            "Código IATA del origen, por ejemplo MAD. Si el dueño no lo dice, usa el que sepas de sus memorias."
          ),
          to: iataInput.describe("Código IATA del destino, por ejemplo FCO."),
          outboundDate: dayInput.describe(
            "Fecha de ida, AAAA-MM-DD, resuelta con la fecha actual."
          ),
          returnDate: dayInput
            .optional()
            .describe("Fecha de vuelta, AAAA-MM-DD; omítela si es solo ida."),
          adults: passengersInput("Adultos (18 años o más).", 1),
          children: passengersInput("Niños de 2 a 11 años.", 0),
          infants: passengersInput("Bebés de menos de 2 años.", 0),
          cabinClass: z
            .enum(Object.keys(CABIN_CLASSES) as [keyof typeof CABIN_CLASSES])
            .optional()
            .describe("Clase, solo si el dueño la pide."),
          currency: currencyInput,
          country: countryInput,
        }),
        execute: ({
          from,
          to,
          outboundDate,
          returnDate,
          adults,
          children,
          infants,
          cabinClass,
          currency,
          country,
        }) =>
          run(
            "COMPOSIO_SEARCH_FLIGHTS",
            {
              departure_id: from,
              arrival_id: to,
              outbound_date: outboundDate,
              ...(returnDate ? { return_date: returnDate } : {}),
              adults,
              children,
              infants,
              ...(cabinClass
                ? { travel_class: CABIN_CLASSES[cabinClass] }
                : {}),
              currency,
              ...region(country),
            },
            (data) =>
              mapFlights(data, {
                from,
                to,
                outboundDate,
                returnDate,
                currency,
                passengers: adults + children + infants,
              })
          ),
      }),
      search_news: tool({
        description:
          "Busca noticias recientes sobre un tema en medios de prensa. Devuelve titulares con su medio y cuándo se publicaron.",
        inputSchema: z.object({
          query: z.string().min(1).describe("El tema de las noticias."),
          country: countryInput,
        }),
        execute: ({ query, country }) =>
          run("COMPOSIO_SEARCH_NEWS", { query, ...region(country) }, (data) =>
            mapNews(data, { query })
          ),
      }),
      search_hotels: tool({
        description:
          "Busca hoteles en un lugar para unas fechas, con precio por noche, valoración y enlace.",
        inputSchema: z.object({
          place: z
            .string()
            .min(1)
            .describe(
              "Ciudad, barrio o lugar, por ejemplo «Lisboa» o «Chiado, Lisboa»."
            ),
          checkIn: dayInput.describe("Fecha de entrada, AAAA-MM-DD."),
          checkOut: dayInput.describe("Fecha de salida, AAAA-MM-DD."),
          adults: passengersInput("Adultos.", 2),
          children: passengersInput("Niños.", 0),
          currency: currencyInput,
          country: countryInput,
        }),
        execute: ({
          place,
          checkIn,
          checkOut,
          adults,
          children,
          currency,
          country,
        }) =>
          run(
            "COMPOSIO_SEARCH_HOTELS",
            {
              q: place,
              check_in_date: checkIn,
              check_out_date: checkOut,
              adults,
              children,
              currency,
              ...region(country),
            },
            (data) => mapHotels(data, { place, checkIn, checkOut, currency })
          ),
      }),
      search_places: tool({
        description:
          "Busca sitios reales en Google Maps (restaurantes, tiendas, museos…) con su valoración y dirección.",
        inputSchema: z.object({
          query: z
            .string()
            .min(1)
            .describe(
              "Qué sitios buscar, por ejemplo «restaurantes japoneses»."
            ),
          near: z
            .string()
            .min(1)
            .optional()
            .describe(
              "Cerca de dónde, con la ciudad, por ejemplo «Sol, Madrid». Sin él, el lugar debe ir en query."
            ),
        }),
        execute: ({ query, near }) =>
          run(
            "COMPOSIO_SEARCH_GOOGLE_MAPS",
            { q: near ? `${query} cerca de ${near}` : query },
            (data) => mapPlaces(data, { query, near })
          ),
      }),
      search_events: tool({
        description:
          "Busca eventos próximos (conciertos, festivales, teatro, conferencias…) con su fecha y lugar.",
        inputSchema: z.object({
          query: z
            .string()
            .min(1)
            .describe(
              "El tipo de evento, por ejemplo «conciertos de jazz»; no vale solo «eventos»."
            ),
          place: z
            .string()
            .min(1)
            .optional()
            .describe("La ciudad, solo su nombre, por ejemplo «Madrid»."),
          country: countryInput,
        }),
        execute: ({ query, place, country }) =>
          run(
            "COMPOSIO_SEARCH_EVENT",
            {
              query,
              ...(place ? { location: place } : {}),
              ...region(country),
            },
            (data) => mapEvents(data, { query, place })
          ),
      }),
    },
    outcome: () => latestList ?? latestSources,
  }
}
