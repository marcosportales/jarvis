import { describe, expect, it } from "vitest"

import { parseTurnRequest } from "./request"

const LAYOUT = [
  {
    id: "results",
    name: "Resultados",
    shown: true,
    spot: "left-top",
    settings: {},
  },
]

const RESULTS = {
  heading: "Vuelos MAD → FCO · vie 16 oct",
  results: [
    {
      title: "Iberia",
      subtitle: "MAD 07:10 → FCO 09:35",
      facts: [{ label: "Precio", value: "412 €" }],
      source: "Google Flights",
    },
  ],
}

describe("Reading a Turn request", () => {
  it("accepts the Results on screen", () => {
    const parsed = parseTurnRequest({
      text: "¿Y el segundo?",
      widgets: LAYOUT,
      results: RESULTS,
    })

    expect(parsed).toEqual({
      ok: true,
      request: { text: "¿Y el segundo?", widgets: LAYOUT, results: RESULTS },
    })
  })

  it("reads no Results, or null ones, as nothing on screen", () => {
    for (const results of [undefined, null]) {
      const parsed = parseTurnRequest({
        text: "Hola",
        widgets: LAYOUT,
        results,
      })
      expect(parsed).toEqual({
        ok: true,
        request: { text: "Hola", widgets: LAYOUT },
      })
    }
  })

  it.each([
    ["a list", []],
    ["no heading", { results: [] }],
    ["a Result with no title", { heading: "x", results: [{ facts: [] }] }],
    [
      "a fact that isn't text",
      {
        heading: "x",
        results: [{ title: "a", facts: [{ label: "P", value: 4 }] }],
      },
    ],
  ])("rejects Results with %s", (_, results) => {
    expect(
      parseTurnRequest({ text: "Hola", widgets: LAYOUT, results })
    ).toEqual({ ok: false, field: "results" })
  })

  it("names the first field that failed, as before", () => {
    expect(parseTurnRequest({ text: " ", widgets: LAYOUT })).toEqual({
      ok: false,
      field: "text",
    })
    expect(parseTurnRequest({ text: "Hola", widgets: "x" })).toEqual({
      ok: false,
      field: "widgets",
    })
    expect(parseTurnRequest("not an object")).toEqual({
      ok: false,
      field: "text",
    })
  })
})
