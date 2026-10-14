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

/** Only the items that parse; one odd item doesn't lose the others. */
function readableItems<T>(
  items: unknown[] | null | undefined,
  schema: z.ZodType<T>
) {
  return (items ?? []).flatMap((item) => {
    const parsed = schema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
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
  /** Every price is for all of them together (ticket 01). */
  passengers: number
}

/**
 * Best flights first, then the others. A round trip lists its outbound
 * flights, priced for the whole trip; every price is for all the passengers.
 * No flight has a link of its own, so each links to the whole search on
 * Google Flights.
 */
export function mapFlights(
  data: unknown,
  { from, to, outboundDate, returnDate, currency, passengers }: FlightsSearch
) {
  const { best_flights, other_flights, search_metadata } =
    flightsSchema.parse(data).results
  const url = search_metadata?.google_flights_url
  const flights = readableItems(
    [...(best_flights ?? []), ...(other_flights ?? [])],
    flightSchema
  )

  const priceLabel =
    (returnDate ? "Precio ida y vuelta" : "Precio") +
    (passengers > 1 ? `, ${passengers} pasajeros` : "")
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
          ? { label: priceLabel, value: money(flight.price, currency) }
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

/** "4,0 de 5 (3102 opiniones)", or nothing without a rating. */
function rating(stars: number | null | undefined, reviews?: number | null) {
  if (stars == null) return null
  const value = stars.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const count = reviews ? ` (${reviews.toLocaleString("es-ES")} opiniones)` : ""
  return { label: "Valoración", value: `${value} de 5${count}` }
}

const newsSchema = z.object({ news_results: z.array(z.unknown()).nullish() })

const newsItemSchema = z.object({
  title: z.string(),
  snippet: z.string().nullish(),
  link: z.string().nullish(),
  source: z.string().nullish(),
  /** Relative and in Spanish, e.g. "hace 16 horas". */
  date: z.string().nullish(),
})

export function mapNews(data: unknown, { query }: { query: string }) {
  const items = readableItems(
    newsSchema.parse(data).news_results,
    newsItemSchema
  )
  return {
    kind: "news",
    heading: `Noticias: ${query}`,
    results: items.slice(0, MAX_RESULTS).map((item) =>
      result({
        title: item.title,
        subtitle: item.snippet,
        facts: [item.date ? { label: "Publicada", value: item.date } : null],
        url: item.link,
        source: item.source ?? (item.link ? siteOf(item.link) : undefined),
      })
    ),
  } satisfies SearchOutcome
}

/** "3–7 nov", or "30 oct – 2 nov" across months. */
function stayDates(checkIn: string, checkOut: string) {
  const [inDay, inMonth] = shortDay(checkIn).split(" ").slice(1)
  const [outDay, outMonth] = shortDay(checkOut).split(" ").slice(1)
  if (!inDay || !outDay) return `${checkIn} – ${checkOut}`
  return inMonth === outMonth
    ? `${inDay}–${outDay} ${outMonth}`
    : `${inDay} ${inMonth} – ${outDay} ${outMonth}`
}

const hotelsSchema = z.object({
  results: z.object({ properties: z.array(z.unknown()).nullish() }),
})

const hotelSchema = z.object({
  name: z.string(),
  hotel_class: z.string().nullish(),
  link: z.string().nullish(),
  overall_rating: z.number().nullish(),
  reviews: z.number().nullish(),
  address: z.string().nullish(),
  rate_per_night: z
    .object({ extracted_lowest: z.number().nullish() })
    .nullish(),
})

export type HotelsSearch = {
  place: string
  /** `YYYY-MM-DD`. */
  checkIn: string
  checkOut: string
  currency: string
}

export function mapHotels(
  data: unknown,
  { place, checkIn, checkOut, currency }: HotelsSearch
) {
  const hotels = readableItems(
    hotelsSchema.parse(data).results.properties,
    hotelSchema
  )
  return {
    kind: "hotels",
    heading: `Hoteles en ${place} · ${stayDates(checkIn, checkOut)}`,
    results: hotels.slice(0, MAX_RESULTS).map((hotel) => {
      const perNight = hotel.rate_per_night?.extracted_lowest
      return result({
        title: hotel.name,
        subtitle: hotel.hotel_class,
        facts: [
          perNight != null
            ? { label: "Precio por noche", value: money(perNight, currency) }
            : null,
          rating(hotel.overall_rating, hotel.reviews),
          hotel.address ? { label: "Dirección", value: hotel.address } : null,
        ],
        url: hotel.link,
        source: hotel.link ? siteOf(hotel.link) : undefined,
      })
    }),
  } satisfies SearchOutcome
}

const placesSchema = z.object({
  results: z.object({
    local_results: z.array(z.unknown()).nullish(),
    place_results: z.unknown().optional(),
  }),
})

const placeSchema = z.object({
  title: z.string(),
  /** In English: Google Maps here takes no language (ticket 01). */
  type: z.string().nullish(),
  rating: z.number().nullish(),
  reviews: z.number().nullish(),
  address: z.string().nullish(),
  place_id: z.string().nullish(),
})

/** Google's documented Maps URL for a place, which opens it in Maps. */
function mapsLink(title: string, placeId: string | null | undefined) {
  if (!placeId) return undefined
  const params = new URLSearchParams({
    api: "1",
    query: title,
    query_place_id: placeId,
  })
  return `https://www.google.com/maps/search/?${params}`
}

/** A search for several places, or a single place, both read the same. */
export function mapPlaces(
  data: unknown,
  { query, near }: { query: string; near?: string }
) {
  const { local_results, place_results } = placesSchema.parse(data).results
  const places = readableItems(
    local_results ?? (place_results ? [place_results] : []),
    placeSchema
  )
  return {
    kind: "places",
    heading: near
      ? `Lugares: ${query} · cerca de ${near}`
      : `Lugares: ${query}`,
    results: places.slice(0, MAX_RESULTS).map((place) =>
      result({
        title: place.title,
        subtitle: place.type,
        facts: [
          rating(place.rating, place.reviews),
          place.address ? { label: "Dirección", value: place.address } : null,
        ],
        url: mapsLink(place.title, place.place_id),
        source: "Google Maps",
      })
    ),
  } satisfies SearchOutcome
}

const eventsSchema = z.object({
  results: z.object({ events_results: z.array(z.unknown()).nullish() }),
})

const eventSchema = z.object({
  title: z.string(),
  /** Absent in every result when confirmed (ticket 01). */
  link: z.string().nullish(),
  /** In English, e.g. "Oct 16, 7:30 PM". */
  date: z.object({ when: z.string().nullish() }).nullish(),
  venue: z.object({ name: z.string().nullish() }).nullish(),
  address: z.array(z.string()).nullish(),
})

export function mapEvents(
  data: unknown,
  { query, place }: { query: string; place?: string }
) {
  const events = readableItems(
    eventsSchema.parse(data).results.events_results,
    eventSchema
  )
  return {
    kind: "events",
    heading: place ? `Eventos: ${query} · ${place}` : `Eventos: ${query}`,
    results: events.slice(0, MAX_RESULTS).map((event) => {
      const venue = event.venue?.name
      const where = (event.address ?? []).filter((line) => line !== venue)
      return result({
        title: event.title,
        subtitle: where.join(", "),
        facts: [
          event.date?.when ? { label: "Fecha", value: event.date.when } : null,
          venue ? { label: "Lugar", value: venue } : null,
        ],
        url: event.link,
        source: event.link ? siteOf(event.link) : undefined,
      })
    }),
  } satisfies SearchOutcome
}
