"use client"

import { useEffect, useState } from "react"
import {
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import type { WeatherIcon } from "@/lib/weather/conditions"
import { locateOwner } from "@/lib/weather/owner-location"
import type { WeatherResult } from "@/lib/weather/weather"
import { weatherSettingsSchema } from "@/lib/widgets/catalog"
import type { WidgetProps } from "@/lib/widgets/registry"

const REFRESH_MS = 15 * 60 * 1000

const ICONS: Record<WeatherIcon, LucideIcon> = {
  sun: SunIcon,
  "cloud-sun": CloudSunIcon,
  cloud: CloudIcon,
  "cloud-fog": CloudFogIcon,
  "cloud-drizzle": CloudDrizzleIcon,
  "cloud-rain": CloudRainIcon,
  "cloud-snow": CloudSnowIcon,
  "cloud-lightning": CloudLightningIcon,
}

/** Query for the endpoint: the named place, or else where the Owner is. */
async function weatherParams(place: string | undefined) {
  if (place) return `?${new URLSearchParams({ place })}`
  const coords = await locateOwner()
  return coords
    ? `?${new URLSearchParams({
        lat: String(coords.latitude),
        lon: String(coords.longitude),
      })}`
    : ""
}

async function loadWeather(place: string | undefined): Promise<WeatherResult> {
  try {
    const response = await fetch(`/api/weather${await weatherParams(place)}`)
    if (!response.ok) return { status: "failed" }
    return (await response.json()) as WeatherResult
  } catch {
    return { status: "failed" }
  }
}

const degrees = (value: number) => `${Math.round(value)}°`

/** Shows the Owner's location, or the place in its Widget Settings. */
export function WeatherWidget({ settings, updateSettings }: WidgetProps) {
  const parsed = weatherSettingsSchema.safeParse(settings)
  const place = parsed.success ? parsed.data.place : undefined
  /** The last load and which place it was for, so a new place shows loading. */
  const [loaded, setLoaded] = useState<{
    place: string | undefined
    result: WeatherResult
  } | null>(null)

  // A failed load stays on screen until the next refresh retries it.
  useEffect(() => {
    let active = true
    const refresh = () =>
      void loadWeather(place).then(
        (result) => active && setLoaded({ place, result })
      )
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [place])

  const result = loaded && loaded.place === place ? loaded.result : null
  const backToOwner = place !== undefined && (
    <Button
      variant="outline"
      size="xs"
      className="mt-1 cursor-pointer self-start"
      onClick={() => updateSettings({})}
    >
      📍 Mi ubicación
    </Button>
  )

  if (result === null) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>
    )
  }

  if (result.status !== "ok") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          No pude cargar el tiempo
        </p>
        {backToOwner}
      </div>
    )
  }

  const { place: resolved, current, today } = result.weather
  const Icon = ICONS[current.condition.icon]
  return (
    <div className="flex flex-col gap-1">
      <p className="truncate font-medium">
        {resolved.country
          ? `${resolved.name}, ${resolved.country}`
          : resolved.name}
      </p>
      <div className="flex items-center gap-3">
        <Icon className="size-8 shrink-0" aria-hidden />
        <span className="text-3xl font-semibold tabular-nums">
          {degrees(current.temperature)}C
        </span>
      </div>
      <p>{current.condition.text}</p>
      <p className="text-muted-foreground tabular-nums">
        Máx. {degrees(today.high)} · Mín. {degrees(today.low)} · Viento{" "}
        {Math.round(current.wind)} km/h
      </p>
      {backToOwner}
    </div>
  )
}
