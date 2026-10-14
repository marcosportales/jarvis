import { describe, expect, it } from "vitest"

import {
  EVENTS,
  FLIGHTS,
  FLIGHTS_ROUND_TRIP,
  FLIGHTS_WITH_LAYOVER,
  HOTELS,
  NEWS,
  PAGE,
  PAGE_FAILED,
  PLACES,
  WEB,
} from "./fixtures"
import {
  MAX_RESULTS,
  mapEvents,
  mapFlights,
  mapHotels,
  mapNews,
  mapPage,
  mapPlaces,
  mapWeb,
} from "./mappers"

describe("Mapping a web Search", () => {
  it("turns citations into Results, with their site as the source", () => {
    const outcome = mapWeb(WEB, { query: "horario del Prado" })

    expect(outcome.kind).toBe("web")
    expect(outcome.heading).toBe("Búsqueda: horario del Prado")
    expect(outcome.results[0]).toEqual({
      title: "Horarios y precios - Museo Nacional del Prado",
      facts: [],
      url: "https://museodelprado.es/visita/horarios-y-tarifas",
      source: "museodelprado.es",
    })
    expect(outcome.results.map((result) => result.source)).toEqual([
      "museodelprado.es",
      "museodelprado.es",
      "madrid.es",
    ])
  })

  it("keeps the narrative answer only as text for the model", () => {
    const outcome = mapWeb(WEB, { query: "horario del Prado" })

    expect(outcome.answer).toMatch(/^El Museo del Prado abre de lunes a sábado/)
  })

  it("gives a citation's publication date as a fact", () => {
    const outcome = mapWeb(
      {
        citations: [
          {
            id: "https://elpais.com/a",
            url: "https://www.elpais.com/a",
            title: "Una noticia",
            publishedDate: "2026-10-13T08:00:00.000Z",
          },
        ],
      },
      { query: "noticia" }
    )

    expect(outcome.results).toEqual([
      {
        title: "Una noticia",
        facts: [{ label: "Fecha", value: "13 oct 2026" }],
        url: "https://www.elpais.com/a",
        source: "elpais.com",
      },
    ])
  })

  it("caps the Results and drops citations without a URL", () => {
    const citations = Array.from({ length: 14 }, (_, i) => ({
      id: `https://example.com/${i}`,
      url: i === 0 ? undefined : `https://example.com/${i}`,
      title: `Página ${i}`,
    }))

    const outcome = mapWeb({ citations }, { query: "algo" })

    expect(outcome.results).toHaveLength(MAX_RESULTS)
    expect(outcome.results[0]?.title).toBe("Página 1")
  })

  it("finds nothing in a response without citations", () => {
    expect(mapWeb({ answer: "" }, { query: "algo" })).toMatchObject({
      results: [],
    })
  })

  it("throws on a response it can't read", () => {
    expect(() => mapWeb("not a response", { query: "algo" })).toThrow()
  })
})

describe("Mapping a page read", () => {
  it("gives the page as one Result and its text for the model", () => {
    const outcome = mapPage(PAGE, {
      url: "https://museodelprado.es/visita/horarios-y-tarifas",
    })

    expect(outcome).toMatchObject({
      kind: "page",
      heading: "Horarios y precios - Museo Nacional del Prado",
      results: [
        {
          title: "Horarios y precios - Museo Nacional del Prado",
          facts: [],
          url: "https://museodelprado.es/visita/horarios-y-tarifas",
          source: "museodelprado.es",
        },
      ],
    })
    expect(outcome.answer).toContain("Lunes a sábado: de 10:00 a 20:00 h")
  })

  it("finds nothing when the page couldn't be crawled", () => {
    const outcome = mapPage(PAGE_FAILED, {
      url: "https://www.museodelprado.es/visita-museo",
    })

    expect(outcome).toEqual({
      kind: "page",
      heading: "museodelprado.es",
      results: [],
    })
  })

  it("cuts a long page's text", () => {
    const outcome = mapPage(
      { results: [{ url: "https://a.es/", text: "x".repeat(20_000) }] },
      { url: "https://a.es/" }
    )

    expect(outcome.answer!.length).toBeLessThan(6_000)
    expect(outcome.results[0]?.title).toBe("a.es")
  })
})

describe("Mapping a flights Search", () => {
  const madridRome = {
    from: "MAD",
    to: "FCO",
    outboundDate: "2026-10-16",
    currency: "EUR",
    passengers: 1,
  }

  it("lists the best flights first, with airline, times, duration, stops and price", () => {
    const outcome = mapFlights(FLIGHTS, madridRome)

    expect(outcome.kind).toBe("flights")
    expect(outcome.heading).toBe("Vuelos MAD → FCO · vie 16 oct")
    expect(outcome.results.map(({ title }) => title)).toEqual([
      "Wizz Air",
      "Ryanair",
      "Ryanair",
      "ITA",
    ])
    expect(outcome.results[0]).toEqual({
      title: "Wizz Air",
      subtitle: "MAD 22:55 → FCO 01:25 (+1)",
      facts: [
        { label: "Precio", value: "60 €" },
        { label: "Duración", value: "2 h 30 min" },
        { label: "Escalas", value: "Directo" },
      ],
      url: expect.stringMatching(
        /^https:\/\/www\.google\.com\/travel\/flights/
      ),
      source: "Google Flights",
    })
    expect(outcome.results[2]?.subtitle).toBe("MAD 05:55 → FCO 08:20")
  })

  it("drops booking tokens and everything else the Owner doesn't need", () => {
    const outcome = mapFlights(FLIGHTS, madridRome)

    expect(JSON.stringify(outcome)).not.toMatch(
      /booking_token|carbon|airline_logo|W4 6016/
    )
  })

  it("names a flight's layovers", () => {
    const outcome = mapFlights(FLIGHTS_WITH_LAYOVER, {
      from: "MAD",
      to: "HND",
      outboundDate: "2026-11-10",
      currency: "EUR",
      passengers: 1,
    })

    expect(outcome.results[0]).toMatchObject({
      title: "China Eastern",
      subtitle: "MAD 10:30 → HND 18:30 (+1)",
      facts: [
        { label: "Precio", value: "447 €" },
        { label: "Duración", value: "24 h" },
        { label: "Escalas", value: "1 escala (PVG)" },
      ],
    })
  })

  it("prices a round trip for every passenger, as the provider does, and gives both dates", () => {
    const outcome = mapFlights(FLIGHTS_ROUND_TRIP, {
      from: "MAD",
      to: "LIS",
      outboundDate: "2026-11-03",
      returnDate: "2026-11-07",
      currency: "EUR",
      passengers: 2,
    })

    expect(outcome.heading).toBe("Vuelos MAD ⇄ LIS · mar 3 nov – sáb 7 nov")
    expect(outcome.results[0]?.facts[0]).toEqual({
      label: "Precio ida y vuelta, 2 pasajeros",
      value: "172 €",
    })
  })

  it("prices in the currency asked for", () => {
    const outcome = mapFlights(FLIGHTS, { ...madridRome, currency: "USD" })

    expect(outcome.results[0]?.facts[0]?.value).toBe("60 US$")
  })

  it("caps the flights", () => {
    const many = {
      results: {
        ...FLIGHTS.results,
        other_flights: Array.from(
          { length: 12 },
          () => FLIGHTS.results.other_flights[0]
        ),
      },
    }

    expect(mapFlights(many, madridRome).results).toHaveLength(MAX_RESULTS)
  })

  it("finds nothing when there are no flights", () => {
    expect(mapFlights({ results: {} }, madridRome).results).toEqual([])
  })
})

describe("Mapping a news Search", () => {
  it("gives each headline with its source, time and link", () => {
    const outcome = mapNews(NEWS, { query: "Real Madrid" })

    expect(outcome.kind).toBe("news")
    expect(outcome.heading).toBe("Noticias: Real Madrid")
    expect(outcome.results).toHaveLength(3)
    expect(outcome.results[0]).toEqual({
      title: "¿Qué pasó en el primer minuto al que hace referencia Mourinho?",
      subtitle: expect.stringMatching(/^El técnico esquivó cinco preguntas/),
      facts: [{ label: "Publicada", value: "hace 16 horas" }],
      url: expect.stringMatching(/^https:\/\/www\.marca\.com\//),
      source: "MARCA",
    })
  })

  it("finds nothing in an empty news response", () => {
    expect(
      mapNews({ news_results: [], has_results: false }, { query: "x" }).results
    ).toEqual([])
  })
})

describe("Mapping a hotels Search", () => {
  const lisbon = {
    place: "Lisboa",
    checkIn: "2026-11-03",
    checkOut: "2026-11-07",
    currency: "EUR",
  }

  it("gives each hotel's price per night, rating and link", () => {
    const outcome = mapHotels(HOTELS, lisbon)

    expect(outcome.kind).toBe("hotels")
    expect(outcome.heading).toBe("Hoteles en Lisboa · 3–7 nov")
    expect(outcome.results[0]).toEqual({
      title: "VIP Grand Lisboa Hotel & Spa",
      subtitle: "Hotel de 5 estrellas",
      facts: [
        { label: "Precio por noche", value: "98 €" },
        { label: "Valoración", value: "4,0 de 5 (3102 opiniones)" },
        { label: "Dirección", value: "Avenida 5 de Outubro 197" },
      ],
      url: expect.stringMatching(/^https:\/\/www\.viphotels\.com\//),
      source: "viphotels.com",
    })
    expect(JSON.stringify(outcome)).not.toMatch(/property_token|gps/)
  })

  it("spans months in the heading when the stay does", () => {
    const outcome = mapHotels(HOTELS, {
      ...lisbon,
      checkIn: "2026-10-30",
      checkOut: "2026-11-02",
    })

    expect(outcome.heading).toBe("Hoteles en Lisboa · 30 oct – 2 nov")
  })
})

describe("Mapping a places Search", () => {
  it("gives each place's rating, address and a Maps link", () => {
    const outcome = mapPlaces(PLACES, {
      query: "restaurantes japoneses",
      near: "Sol, Madrid",
    })

    expect(outcome.kind).toBe("places")
    expect(outcome.heading).toBe(
      "Lugares: restaurantes japoneses · cerca de Sol, Madrid"
    )
    expect(outcome.results[1]).toEqual({
      title: "MUSASHI",
      subtitle: "Japanese restaurant",
      facts: [
        { label: "Valoración", value: "4,5 de 5 (2630 opiniones)" },
        {
          label: "Dirección",
          value: "C. de las Conchas, 4, Centro, 28013 Madrid, Spain",
        },
      ],
      url: "https://www.google.com/maps/search/?api=1&query=MUSASHI&query_place_id=ChIJyyYDC3woQg0RZ8cee-5110o",
      source: "Google Maps",
    })
  })

  it("reads a single place too", () => {
    const outcome = mapPlaces(
      {
        results: {
          place_results: {
            title: "Museo del Prado",
            type: "Art museum",
            rating: 4.8,
            reviews: 150000,
            address: "C. de Ruiz de Alarcón, 23, 28014 Madrid",
            place_id: "ChIJ_prado",
          },
        },
      },
      { query: "Museo del Prado" }
    )

    expect(outcome.heading).toBe("Lugares: Museo del Prado")
    expect(outcome.results).toEqual([
      expect.objectContaining({
        title: "Museo del Prado",
        facts: [
          { label: "Valoración", value: "4,8 de 5 (150.000 opiniones)" },
          {
            label: "Dirección",
            value: "C. de Ruiz de Alarcón, 23, 28014 Madrid",
          },
        ],
      }),
    ])
  })
})

describe("Mapping an events Search", () => {
  it("gives each event's date and venue; with no link, its card is plain", () => {
    const outcome = mapEvents(EVENTS, { query: "conciertos", place: "Madrid" })

    expect(outcome.kind).toBe("events")
    expect(outcome.heading).toBe("Eventos: conciertos · Madrid")
    expect(outcome.results[1]).toEqual({
      title: "Concierto sinfónica B/2 Viernes",
      subtitle: "Madrid, Spain",
      facts: [
        { label: "Fecha", value: "Oct 16, 7:30 PM" },
        { label: "Lugar", value: "Teatro Monumental" },
      ],
    })
  })

  it("links an event that has a link", () => {
    const outcome = mapEvents(
      {
        results: {
          events_results: [
            { title: "Jazz", link: "https://www.entradas.com/jazz", date: {} },
          ],
        },
      },
      { query: "jazz" }
    )

    expect(outcome.results[0]).toMatchObject({
      url: "https://www.entradas.com/jazz",
      source: "entradas.com",
    })
  })
})
