import { describe, expect, it } from "vitest"

import {
  FLIGHTS,
  FLIGHTS_ROUND_TRIP,
  FLIGHTS_WITH_LAYOVER,
  PAGE,
  PAGE_FAILED,
  WEB,
} from "./fixtures"
import { MAX_RESULTS, mapFlights, mapPage, mapWeb } from "./mappers"

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

  it("prices a round trip as such and gives both dates", () => {
    const outcome = mapFlights(FLIGHTS_ROUND_TRIP, {
      from: "MAD",
      to: "LIS",
      outboundDate: "2026-11-03",
      returnDate: "2026-11-07",
      currency: "EUR",
    })

    expect(outcome.heading).toBe("Vuelos MAD ⇄ LIS · mar 3 nov – sáb 7 nov")
    expect(outcome.results[0]?.facts[0]).toEqual({
      label: "Precio ida y vuelta",
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
