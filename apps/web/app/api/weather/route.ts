import type { NextRequest } from "next/server"

import { getWeather } from "@/lib/weather/server"
import type { Coordinates } from "@/lib/weather/weather"

/** `lat` and `lon` must come together and be real coordinates. */
function parseCoords(params: URLSearchParams): Coordinates | null | undefined {
  const lat = params.get("lat")
  const lon = params.get("lon")
  if (lat === null && lon === null) return undefined
  const latitude = Number(lat)
  const longitude = Number(lon)
  if (
    lat === null ||
    lon === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null
  }
  return { latitude, longitude }
}

/**
 * `GET /api/weather?place=Londres` or `?lat=40.4&lon=-3.7`; with neither, the
 * fallback city. Answers the weather module's result as JSON.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const coords = parseCoords(params)
  if (coords === null) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 })
  }

  const result = await getWeather().forPlace({
    place: params.get("place") ?? undefined,
    coords,
  })
  return Response.json(result)
}
