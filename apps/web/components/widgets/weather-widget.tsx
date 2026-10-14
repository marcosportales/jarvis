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

import { Skeleton } from "@workspace/ui/components/skeleton"

import type { WeatherIcon } from "@/lib/weather/conditions"
import { locateOwner } from "@/lib/weather/owner-location"
import type { WeatherResult } from "@/lib/weather/weather"

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

async function loadWeather(): Promise<WeatherResult> {
  try {
    const coords = await locateOwner()
    const params = coords
      ? `?${new URLSearchParams({
          lat: String(coords.latitude),
          lon: String(coords.longitude),
        })}`
      : ""
    const response = await fetch(`/api/weather${params}`)
    if (!response.ok) return { status: "failed" }
    return (await response.json()) as WeatherResult
  } catch {
    return { status: "failed" }
  }
}

const degrees = (value: number) => `${Math.round(value)}°`

export function WeatherWidget() {
  const [result, setResult] = useState<WeatherResult | null>(null)

  // A failed load stays on screen until the next refresh retries it.
  useEffect(() => {
    let active = true
    const refresh = () =>
      void loadWeather().then((next) => active && setResult(next))
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

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
      <p className="text-sm text-muted-foreground">No pude cargar el tiempo</p>
    )
  }

  const { place, current, today } = result.weather
  const Icon = ICONS[current.condition.icon]
  return (
    <div className="flex flex-col gap-1">
      <p className="truncate font-medium">
        {place.country ? `${place.name}, ${place.country}` : place.name}
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
    </div>
  )
}
