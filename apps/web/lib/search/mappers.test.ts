import { describe, expect, it } from "vitest"

import { PAGE, PAGE_FAILED, WEB } from "./fixtures"
import { MAX_RESULTS, mapPage, mapWeb } from "./mappers"

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
