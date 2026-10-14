import { describe, expect, it } from "vitest"

import { weatherCondition } from "./conditions"
import { createWeather } from "./weather"

/** Recorded from Open-Meteo geocoding for "Valencia" in Spanish. */
const VALENCIA_GEOCODING = {
  results: [
    {
      id: 2509954,
      name: "Valencia",
      latitude: 39.47391,
      longitude: -0.37966,
      country_code: "ES",
      timezone: "Europe/Madrid",
      country: "España",
      admin1: "Comunidad Valenciana",
    },
  ],
  generationtime_ms: 0.69,
}

/** Recorded from Open-Meteo geocoding for a name with no match. */
const NO_GEOCODING_RESULTS = { generationtime_ms: 0.24 }

/** Recorded from the Open-Meteo forecast endpoint. */
const FORECAST = {
  latitude: 39.482338,
  longitude: -0.3959703,
  timezone: "Europe/Madrid",
  current_units: {
    time: "iso8601",
    interval: "seconds",
    temperature_2m: "°C",
    weather_code: "wmo code",
    wind_speed_10m: "km/h",
  },
  current: {
    time: "2026-10-14T02:00",
    interval: 900,
    temperature_2m: 21.3,
    weather_code: 2,
    wind_speed_10m: 3.6,
  },
  daily_units: {
    time: "iso8601",
    weather_code: "wmo code",
    temperature_2m_max: "°C",
    temperature_2m_min: "°C",
    precipitation_probability_max: "%",
  },
  daily: {
    time: ["2026-10-14", "2026-10-15", "2026-10-16"],
    weather_code: [3, 61, 2],
    temperature_2m_max: [26.8, 26.7, 26.1],
    temperature_2m_min: [19.4, 17.6, 17.2],
    precipitation_probability_max: [10, 80, 0],
  },
}

type Route = { status?: number; body?: unknown; error?: Error }

/** Answers Open-Meteo hosts with recorded payloads and records every URL. */
function fakeFetch(
  routes: {
    geocoding?: Route | ((name: string) => Route)
    forecast?: Route
  } = {}
) {
  const requests: URL[] = []
  const fetch = async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input)
    requests.push(url)
    const route =
      url.hostname === "geocoding-api.open-meteo.com"
        ? typeof routes.geocoding === "function"
          ? routes.geocoding(url.searchParams.get("name") ?? "")
          : (routes.geocoding ?? { body: VALENCIA_GEOCODING })
        : (routes.forecast ?? { body: FORECAST })
    if (route.error) throw route.error
    return Response.json(route.body ?? {}, { status: route.status ?? 200 })
  }
  return { fetch: fetch as typeof globalThis.fetch, requests }
}

const forecastRequests = (requests: URL[]) =>
  requests.filter((url) => url.hostname === "api.open-meteo.com")

describe("weather", () => {
  it("uses the Owner's coordinates when no place is named", async () => {
    const { fetch, requests } = fakeFetch()
    const weather = createWeather({ fetch, env: {} })

    const result = await weather.forPlace({
      coords: { latitude: 40.4, longitude: -3.7 },
    })

    expect(result.status).toBe("ok")
    const [forecast] = forecastRequests(requests)
    expect(forecast?.searchParams.get("latitude")).toBe("40.4")
    expect(forecast?.searchParams.get("longitude")).toBe("-3.7")
    expect(requests.some((url) => url.hostname.startsWith("geocoding"))).toBe(
      false
    )
  })

  it("returns current conditions, today's range and 3 days", async () => {
    const { fetch } = fakeFetch()
    const weather = createWeather({ fetch, env: {} })

    const result = await weather.forPlace({
      coords: { latitude: 39.47, longitude: -0.38 },
    })

    expect(result).toEqual({
      status: "ok",
      weather: {
        place: { name: "Tu ubicación" },
        current: {
          temperature: 21.3,
          wind: 3.6,
          condition: weatherCondition(2),
        },
        today: { high: 26.8, low: 19.4 },
        daily: [
          {
            date: "2026-10-14",
            high: 26.8,
            low: 19.4,
            condition: weatherCondition(3),
            rainChance: 10,
          },
          {
            date: "2026-10-15",
            high: 26.7,
            low: 17.6,
            condition: weatherCondition(61),
            rainChance: 80,
          },
          {
            date: "2026-10-16",
            high: 26.1,
            low: 17.2,
            condition: weatherCondition(2),
            rainChance: 0,
          },
        ],
      },
    })
  })

  it("asks for °C, km/h and 3 days in the place's own timezone", async () => {
    const { fetch, requests } = fakeFetch()
    const weather = createWeather({ fetch, env: {} })

    await weather.forPlace({ coords: { latitude: 1, longitude: 2 } })

    const params = forecastRequests(requests)[0]?.searchParams
    expect(params?.get("forecast_days")).toBe("3")
    expect(params?.get("timezone")).toBe("auto")
    expect(params?.get("wind_speed_unit") ?? "kmh").toBe("kmh")
    expect(params?.get("temperature_unit") ?? "celsius").toBe("celsius")
  })

  it("falls back to the env city when there are no coordinates", async () => {
    const { fetch, requests } = fakeFetch()
    const weather = createWeather({
      fetch,
      env: { JARVIS_WEATHER_FALLBACK_CITY: "Valencia" },
    })

    const result = await weather.forPlace({})

    const geocoding = requests.find((url) =>
      url.hostname.startsWith("geocoding")
    )
    expect(geocoding?.searchParams.get("name")).toBe("Valencia")
    expect(result.status === "ok" && result.weather.place).toEqual({
      name: "Valencia",
      country: "España",
    })
    const [forecast] = forecastRequests(requests)
    expect(forecast?.searchParams.get("latitude")).toBe("39.47391")
  })

  it("falls back to Madrid when the env city is not set", async () => {
    const { fetch, requests } = fakeFetch()
    const weather = createWeather({ fetch, env: {} })

    await weather.forPlace({})

    const geocoding = requests.find((url) =>
      url.hostname.startsWith("geocoding")
    )
    expect(geocoding?.searchParams.get("name")).toBe("Madrid")
  })

  it("geocodes a named place in Spanish and returns its country", async () => {
    const { fetch, requests } = fakeFetch()
    const weather = createWeather({ fetch, env: {} })

    const result = await weather.forPlace({
      place: "Valencia",
      coords: { latitude: 51.5, longitude: -0.1 },
    })

    const geocoding = requests.find((url) =>
      url.hostname.startsWith("geocoding")
    )
    expect(geocoding?.searchParams.get("name")).toBe("Valencia")
    expect(geocoding?.searchParams.get("language")).toBe("es")
    expect(geocoding?.searchParams.get("count")).toBe("1")
    expect(result.status === "ok" && result.weather.place).toEqual({
      name: "Valencia",
      country: "España",
    })
    // A named place wins over the Owner's coordinates.
    const [forecast] = forecastRequests(requests)
    expect(forecast?.searchParams.get("latitude")).toBe("39.47391")
  })

  it("says a named place was not found", async () => {
    const { fetch, requests } = fakeFetch({
      geocoding: { body: NO_GEOCODING_RESULTS },
    })
    const weather = createWeather({ fetch, env: {} })

    const result = await weather.forPlace({ place: "Xyzzqqplorf" })

    expect(result).toEqual({ status: "not-found", place: "Xyzzqqplorf" })
    expect(forecastRequests(requests)).toHaveLength(0)
  })

  it("treats a blank place as no place", async () => {
    const { fetch, requests } = fakeFetch()
    const weather = createWeather({ fetch, env: {} })

    await weather.forPlace({
      place: "  ",
      coords: { latitude: 1, longitude: 2 },
    })

    expect(requests.some((url) => url.hostname.startsWith("geocoding"))).toBe(
      false
    )
  })

  it.each<[string, Parameters<typeof fakeFetch>[0]]>([
    ["the forecast errors", { forecast: { status: 500, body: {} } }],
    ["the forecast is unreachable", { forecast: { error: new TypeError() } }],
    ["the forecast is malformed", { forecast: { body: { current: {} } } }],
    ["geocoding errors", { geocoding: { status: 502, body: {} } }],
    ["geocoding is unreachable", { geocoding: { error: new TypeError() } }],
  ])("says the service failed when %s", async (_, routes) => {
    const { fetch } = fakeFetch(routes)
    const weather = createWeather({ fetch, env: {} })

    await expect(weather.forPlace({ place: "Valencia" })).resolves.toEqual({
      status: "failed",
    })
  })
})

describe("weatherCondition", () => {
  it.each([
    [0, "Despejado", "sun"],
    [2, "Parcialmente nublado", "cloud-sun"],
    [3, "Nublado", "cloud"],
    [45, "Niebla", "cloud-fog"],
    [53, "Llovizna", "cloud-drizzle"],
    [63, "Lluvia", "cloud-rain"],
    [81, "Chubascos", "cloud-rain"],
    [73, "Nieve", "cloud-snow"],
    [95, "Tormenta", "cloud-lightning"],
  ])("maps WMO code %i to %s", (code, text, icon) => {
    expect(weatherCondition(code)).toEqual({ code, text, icon })
  })

  it("has a neutral condition for unknown codes", () => {
    expect(weatherCondition(1234)).toEqual({
      code: 1234,
      text: "Desconocido",
      icon: "cloud",
    })
  })
})
