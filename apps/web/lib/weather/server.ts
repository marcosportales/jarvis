import "server-only"

import { createWeather, type WeatherService } from "./weather"

/** The weather module wired to the real Open-Meteo and env. */
export function getWeather(): WeatherService {
  return createWeather({ fetch: globalThis.fetch, env: process.env })
}
