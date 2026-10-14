import { z } from "zod"

import type { Fact, SearchOutcome, SearchResult } from "./outcome"

/**
 * Pure functions from a raw `composio_search` response (ticket 01's shapes)
 * to a Search Outcome. They keep only what the Owner needs and drop the rest,
 * images and tokens included. A response they can't read throws.
 */

/** A spoken summary covers a few; the Results Widget scrolls through these. */
export const MAX_RESULTS = 10

/** Enough of a page to answer from without flooding the model. */
const MAX_PAGE_TEXT = 5_000

/** `www.museodelprado.es/…` → `museodelprado.es`; no source if unparseable. */
function siteOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return undefined
  }
}

/** Leaves out the optional fields a Result doesn't have. */
function result({
  title,
  subtitle,
  facts = [],
  url,
  source,
}: {
  title: string
  subtitle?: string | null
  facts?: (Fact | null | undefined)[]
  url?: string | null
  source?: string | null
}): SearchResult {
  return {
    title,
    ...(subtitle ? { subtitle } : {}),
    facts: facts.filter((fact): fact is Fact => !!fact?.value),
    ...(url ? { url } : {}),
    ...(source ? { source } : {}),
  }
}

/** "13 oct 2026", or nothing for a date that doesn't parse. */
function calendarDate(iso: string | null | undefined) {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date
    .toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Madrid",
    })
    .replace(/\./g, "")
}

const webSchema = z.object({
  answer: z.string().nullish(),
  citations: z
    .array(
      z.object({
        title: z.string().nullish(),
        url: z.string().nullish(),
        publishedDate: z.string().nullish(),
      })
    )
    .nullish(),
})

/** Citations become the Results; the narrative answer is a hint only. */
export function mapWeb(data: unknown, { query }: { query: string }) {
  const { answer, citations } = webSchema.parse(data)
  const results = (citations ?? []).flatMap(({ title, url, publishedDate }) => {
    if (!url) return []
    const source = siteOf(url)
    const date = calendarDate(publishedDate)
    return [
      result({
        title: title?.trim() || source || url,
        facts: [date ? { label: "Fecha", value: date } : null],
        url,
        source,
      }),
    ]
  })
  return {
    kind: "web",
    heading: `Búsqueda: ${query}`,
    results: results.slice(0, MAX_RESULTS),
    ...(answer?.trim() ? { answer: answer.trim() } : {}),
  } satisfies SearchOutcome
}

const pageSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string().nullish(),
        url: z.string().nullish(),
        text: z.string().nullish(),
      })
    )
    .nullish(),
})

/** A page that couldn't be read has no Result and no text. */
export function mapPage(data: unknown, { url }: { url: string }) {
  const page = pageSchema.parse(data).results?.find(({ text }) => text?.trim())
  const pageUrl = page?.url ?? url
  const source = siteOf(pageUrl)
  const title = page?.title?.trim() || source || pageUrl
  if (!page?.text) {
    return { kind: "page", heading: title, results: [] } satisfies SearchOutcome
  }
  return {
    kind: "page",
    heading: title,
    results: [result({ title, url: pageUrl, source })],
    answer: page.text.trim().slice(0, MAX_PAGE_TEXT),
  } satisfies SearchOutcome
}

/** "60 €", "60 US$"; whole units, as prices are quoted. */
function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace(/\u00a0/g, " ")
  } catch {
    return `${Math.round(amount)} ${currency}`
  }
}

/** "2 h 30 min", "24 h", "45 min". */
function duration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** `2026-10-16` → "vie 16 oct". */
function shortDay(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed
    .toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    .replace(/[.,]/g, "")
}

const airportTimeSchema = z.object({
  id: z.string(),
  /** `YYYY-MM-DD HH:mm`, local to the airport. */
  time: z.string(),
})

const flightSchema = z.object({
  price: z.number().nullish(),
  total_duration: z.number().nullish(),
  flights: z
    .array(
      z.object({
        airline: z.string().nullish(),
        departure_airport: airportTimeSchema,
        arrival_airport: airportTimeSchema,
      })
    )
    .min(1),
  layovers: z.array(z.object({ id: z.string() })).nullish(),
})

const flightsSchema = z.object({
  results: z.object({
    best_flights: z.array(z.unknown()).nullish(),
    other_flights: z.array(z.unknown()).nullish(),
    search_metadata: z
      .object({ google_flights_url: z.string().nullish() })
      .nullish(),
  }),
})

export type FlightsSearch = {
  /** IATA codes, as the provider needs them. */
  from: string
  to: string
  /** `YYYY-MM-DD`. */
  outboundDate: string
  returnDate?: string
  currency: string
}

/**
 * Best flights first, then the others. A round trip lists its outbound
 * flights, priced for the whole trip. No flight has a link of its own, so
 * each links to the whole search on Google Flights.
 */
export function mapFlights(
  data: unknown,
  { from, to, outboundDate, returnDate, currency }: FlightsSearch
) {
  const { best_flights, other_flights, search_metadata } =
    flightsSchema.parse(data).results
  const url = search_metadata?.google_flights_url
  const flights = [...(best_flights ?? []), ...(other_flights ?? [])].flatMap(
    (raw) => {
      const parsed = flightSchema.safeParse(raw)
      return parsed.success ? [parsed.data] : []
    }
  )

  const results = flights.slice(0, MAX_RESULTS).map((flight) => {
    const first = flight.flights[0]!
    const last = flight.flights.at(-1)!
    const [departDay, departTime] = first.departure_airport.time.split(" ")
    const [arriveDay, arriveTime] = last.arrival_airport.time.split(" ")
    const nextDay = arriveDay !== departDay ? " (+1)" : ""
    const airlines = [
      ...new Set(flight.flights.flatMap(({ airline }) => airline ?? [])),
    ]
    const stops = flight.layovers ?? []
    return result({
      title: airlines.join(" + ") || "Vuelo",
      subtitle: `${first.departure_airport.id} ${departTime} → ${last.arrival_airport.id} ${arriveTime}${nextDay}`,
      facts: [
        flight.price != null
          ? {
              label: returnDate ? "Precio ida y vuelta" : "Precio",
              value: money(flight.price, currency),
            }
          : null,
        flight.total_duration != null
          ? { label: "Duración", value: duration(flight.total_duration) }
          : null,
        {
          label: "Escalas",
          value:
            stops.length === 0
              ? "Directo"
              : `${stops.length} ${stops.length === 1 ? "escala" : "escalas"} (${stops.map(({ id }) => id).join(", ")})`,
        },
      ],
      url,
      source: "Google Flights",
    })
  })

  const dates = returnDate
    ? `${shortDay(outboundDate)} – ${shortDay(returnDate)}`
    : shortDay(outboundDate)
  return {
    kind: "flights",
    heading: `Vuelos ${from} ${returnDate ? "⇄" : "→"} ${to} · ${dates}`,
    results,
  } satisfies SearchOutcome
}
