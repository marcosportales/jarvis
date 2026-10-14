/** Recorded Open-Meteo payloads and a fake `fetch` serving them, for tests. */

/** Recorded from Open-Meteo geocoding for "Valencia" in Spanish. */
export const VALENCIA_GEOCODING = {
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
export const NO_GEOCODING_RESULTS = { generationtime_ms: 0.24 }

/** Recorded from the Open-Meteo forecast endpoint. */
export const FORECAST = {
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

export type Route = { status?: number; body?: unknown; error?: Error }

/** Answers Open-Meteo hosts with recorded payloads and records every URL. */
export function fakeFetch(
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
