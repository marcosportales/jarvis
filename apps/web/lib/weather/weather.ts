import { z } from "zod"

import { weatherCondition, type WeatherCondition } from "./conditions"

export type Env = Record<string, string | undefined>

export type Coordinates = { latitude: number; longitude: number }

/** Real coordinates, as the browser sends them. */
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

/** Used when no place is named, there are no coordinates and env has none. */
const DEFAULT_FALLBACK_CITY = "Madrid"

/** Shown for the Owner's coordinates; Open-Meteo has no reverse geocoding. */
const OWNER_PLACE_NAME = "Tu ubicación"

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
const FORECAST_DAYS = 3

/** `Cordoba,ES`: a name, then an ISO 3166-1 alpha-2 country after a comma. */
const COUNTRY_SUFFIX = /^(.+?)\s*,\s*([a-z]{2})$/i

/**
 * - A named `place` is geocoded and wins over `coords`.
 * - Otherwise the Owner's `coords`, then the fallback city from env.
 */
export type WeatherQuery = { place?: string; coords?: Coordinates }

export type DailyForecast = {
  /** `YYYY-MM-DD` in the place's own timezone. */
  date: string
  high: number
  low: number
  condition: WeatherCondition
  /** Chance of rain, 0–100. */
  rainChance: number
}

/** Temperatures in °C, wind in km/h. */
export type Weather = {
  place: { name: string; country?: string }
  current: { temperature: number; wind: number; condition: WeatherCondition }
  today: { high: number; low: number }
  daily: DailyForecast[]
}

/**
 * - `ok`: the weather for the resolved place.
 * - `not-found`: geocoding has no match for the named place.
 * - `failed`: Open-Meteo couldn't be reached or answered unexpectedly.
 */
export type WeatherResult =
  | { status: "ok"; weather: Weather }
  | { status: "not-found"; place: string }
  | { status: "failed" }

export type WeatherService = {
  forPlace(query: WeatherQuery): Promise<WeatherResult>
}

export type WeatherDeps = {
  fetch: typeof globalThis.fetch
  env: Env
}

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
      })
    )
    .optional(),
})

const forecastSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    precipitation_probability_max: z.array(z.number().nullable()),
  }),
})

class WeatherServiceError extends Error {}

type ResolvedPlace = Coordinates & { name: string; country?: string }

export function createWeather({ fetch, env }: WeatherDeps): WeatherService {
  async function getJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(url)
    } catch (error) {
      throw new WeatherServiceError("Open-Meteo unreachable", { cause: error })
    }
    if (!response.ok) {
      throw new WeatherServiceError(`Open-Meteo answered ${response.status}`)
    }
    return response.json()
  }

  /**
   * Open-Meteo finds nothing for `Cordoba,ES`, and plain `Cordoba` is the
   * bigger Córdoba in Argentina, so a country code narrows the search.
   */
  async function geocode(place: string): Promise<ResolvedPlace | null> {
    const url = new URL(GEOCODING_URL)
    const match = COUNTRY_SUFFIX.exec(place)
    url.searchParams.set("name", match?.[1] ?? place)
    if (match?.[2]) {
      url.searchParams.set("countryCode", match[2].toUpperCase())
    }
    url.searchParams.set("count", "1")
    url.searchParams.set("language", "es")
    url.searchParams.set("format", "json")
    const parsed = geocodingSchema.safeParse(await getJson(url))
    if (!parsed.success) throw new WeatherServiceError("Unexpected geocoding")
    const top = parsed.data.results?.[0]
    if (!top) return null
    return {
      name: top.name,
      latitude: top.latitude,
      longitude: top.longitude,
      ...(top.country ? { country: top.country } : {}),
    }
  }

  async function forecast(place: ResolvedPlace): Promise<Weather> {
    const url = new URL(FORECAST_URL)
    url.searchParams.set("latitude", String(place.latitude))
    url.searchParams.set("longitude", String(place.longitude))
    url.searchParams.set(
      "current",
      "temperature_2m,weather_code,wind_speed_10m"
    )
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    )
    url.searchParams.set("timezone", "auto")
    url.searchParams.set("forecast_days", String(FORECAST_DAYS))
    const parsed = forecastSchema.safeParse(await getJson(url))
    if (!parsed.success) throw new WeatherServiceError("Unexpected forecast")
    const { current, daily } = parsed.data

    const days = daily.time.map((date, i) => {
      const high = daily.temperature_2m_max[i]
      const low = daily.temperature_2m_min[i]
      if (high == null || low == null) {
        throw new WeatherServiceError("Forecast day has no range")
      }
      return {
        date,
        high,
        low,
        condition: weatherCondition(daily.weather_code[i] ?? -1),
        rainChance: daily.precipitation_probability_max[i] ?? 0,
      }
    })
    const today = days[0]
    if (!today) throw new WeatherServiceError("Forecast has no days")

    return {
      place: {
        name: place.name,
        ...(place.country ? { country: place.country } : {}),
      },
      current: {
        temperature: current.temperature_2m,
        wind: current.wind_speed_10m,
        condition: weatherCondition(current.weather_code),
      },
      today: { high: today.high, low: today.low },
      daily: days,
    }
  }

  return {
    async forPlace({ place, coords }) {
      const named = place?.trim()
      try {
        let resolved: ResolvedPlace | null
        if (named) {
          resolved = await geocode(named)
          if (!resolved) return { status: "not-found", place: named }
        } else if (coords) {
          resolved = { ...coords, name: OWNER_PLACE_NAME }
        } else {
          const city =
            env.JARVIS_WEATHER_FALLBACK_CITY?.trim() || DEFAULT_FALLBACK_CITY
          resolved = await geocode(city)
          // A misconfigured fallback city is the service failing, not the Owner.
          if (!resolved) return { status: "failed" }
        }
        return { status: "ok", weather: await forecast(resolved) }
      } catch (error) {
        console.error("Weather lookup failed", error)
        return { status: "failed" }
      }
    },
  }
}
