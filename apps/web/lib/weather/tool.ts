import { tool, type ToolSet } from "ai"
import { z } from "zod"

import { ignoreHealth, type HealthReporter } from "../health/health"
import type { Coordinates, Weather, WeatherService } from "./weather"

const degrees = (value: number) => `${Math.round(value)} °C`

/** The Owner's coordinates have no place name, so say whose they are. */
function placeLine({ place }: Weather, fromCoords: boolean) {
  if (fromCoords) return "la ubicación del dueño"
  return place.country ? `${place.name}, ${place.country}` : place.name
}

/** Plain lines for the model; it turns them into a spoken answer. */
function describe(weather: Weather, fromCoords: boolean) {
  const { current, today, daily } = weather
  const days = daily.map(
    ({ date, condition, high, low, rainChance }) =>
      `- ${date}: ${condition.text}, máxima ${degrees(high)}, mínima ${degrees(low)}, probabilidad de lluvia ${rainChance} %.`
  )
  return [
    `Tiempo en ${placeLine(weather, fromCoords)}.`,
    `Ahora: ${degrees(current.temperature)}, ${current.condition.text}, viento ${Math.round(current.wind)} km/h.`,
    `Hoy: máxima ${degrees(today.high)}, mínima ${degrees(today.low)}.`,
    `Previsión por días:`,
    ...days,
  ].join("\n")
}

/**
 * Jarvis's weather tool for one Turn. With no place it uses the Owner's
 * coordinates sent with the Turn, then the env city. Failures become an
 * answer for the model, never a thrown error, so the Turn goes on.
 */
export function createWeatherTools({
  weather,
  coords,
  report = ignoreHealth,
}: {
  weather: WeatherService
  coords?: Coordinates
  /** Hears whether the weather service answered. */
  report?: HealthReporter
}): ToolSet {
  return {
    get_weather: tool({
      description:
        "Consulta el tiempo actual y la previsión de 3 días. Sin lugar, da el tiempo donde está el dueño.",
      inputSchema: z.object({
        place: z
          .string()
          .optional()
          .describe(
            "Ciudad o lugar por el que pregunta el dueño. Omítelo si pregunta por donde está él."
          ),
      }),
      execute: async ({ place }) => {
        const result = await weather.forPlace({ place, coords })
        report("weather", { ok: result.status !== "failed" })
        switch (result.status) {
          case "ok":
            return describe(result.weather, !place?.trim() && !!coords)
          case "not-found":
            return `No encontré ningún lugar llamado «${result.place}». No cambies ningún widget.`
          case "failed":
            return "El servicio del tiempo no responde ahora mismo."
        }
      },
    }),
  }
}
