import { describe, expect, it } from "vitest"

import { NO_GEOCODING_RESULTS, fakeFetch } from "./fixtures"
import { createWeatherTools } from "./tool"
import { createWeather, type Coordinates, type Env } from "./weather"

function weatherTools({
  routes,
  coords,
  env = {},
}: {
  routes?: Parameters<typeof fakeFetch>[0]
  coords?: Coordinates
  env?: Env
} = {}) {
  const { fetch, requests } = fakeFetch(routes)
  const tools = createWeatherTools({
    weather: createWeather({ fetch, env }),
    coords,
  })
  async function getWeather(input: { place?: string }) {
    const execute = tools.get_weather?.execute
    if (!execute) throw new Error("no get_weather tool")
    return (await execute(input, {
      toolCallId: "call-1",
      messages: [],
      context: {},
    })) as string
  }
  return { getWeather, requests }
}

const forecastAt = (requests: URL[]) => {
  const forecast = requests.find((url) => url.hostname === "api.open-meteo.com")
  return [
    forecast?.searchParams.get("latitude"),
    forecast?.searchParams.get("longitude"),
  ]
}

const geocoded = (requests: URL[]) =>
  requests
    .filter((url) => url.hostname === "geocoding-api.open-meteo.com")
    .map((url) => url.searchParams.get("name"))

describe("get_weather", () => {
  it("uses the Owner's coordinates when no place is asked about", async () => {
    const { getWeather, requests } = weatherTools({
      coords: { latitude: 40.4, longitude: -3.7 },
    })

    const result = await getWeather({})

    expect(forecastAt(requests)).toEqual(["40.4", "-3.7"])
    expect(geocoded(requests)).toEqual([])
    expect(result).toMatch(/ubicación del dueño/)
    expect(result).toMatch(/21 °C/)
  })

  it("falls back to the env city without the Owner's coordinates", async () => {
    const { getWeather, requests } = weatherTools({
      env: { JARVIS_WEATHER_FALLBACK_CITY: "Valencia" },
    })

    const result = await getWeather({})

    expect(geocoded(requests)).toEqual(["Valencia"])
    expect(result).toMatch(/Valencia, España/)
  })

  it("gives a named place with its country, today and the forecast", async () => {
    const { getWeather, requests } = weatherTools({
      coords: { latitude: 51.5, longitude: -0.1 },
    })

    const result = await getWeather({ place: "Valencia" })

    expect(geocoded(requests)).toEqual(["Valencia"])
    expect(result).toMatch(/Valencia, España/)
    expect(result).toMatch(/Parcialmente nublado/)
    expect(result).toMatch(/máxima 27 °C, mínima 19 °C/)
    // Tomorrow, from the recorded 3-day forecast.
    expect(result).toMatch(/2026-10-15.*Lluvia.*80 %/)
  })

  it("tells Jarvis when a named place was not found", async () => {
    const { getWeather } = weatherTools({
      routes: { geocoding: { body: NO_GEOCODING_RESULTS } },
    })

    const result = await getWeather({ place: "Xyzzqqplorf" })

    expect(result).toMatch(/No encontré.*«Xyzzqqplorf»/)
  })

  it("tells Jarvis when the weather service failed, without throwing", async () => {
    const { getWeather } = weatherTools({
      routes: { forecast: { status: 500, body: {} } },
    })

    const result = await getWeather({ place: "Valencia" })

    expect(result).toMatch(/servicio del tiempo no responde/)
  })
})
