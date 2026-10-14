"use client"

import { useEffect, useState, type ReactNode } from "react"
import { BatteryChargingIcon } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import {
  formatMemory,
  formatPercent,
  type SystemStatus,
} from "@/lib/system/status"

/** About how often the numbers refresh. */
const REFRESH_MS = 2_000

/** Null when Jarvis's server couldn't be reached. */
async function loadStatus(): Promise<SystemStatus | null> {
  try {
    const response = await fetch("/api/system", { cache: "no-store" })
    if (!response.ok) return null
    return (await response.json()) as SystemStatus
  } catch {
    return null
  }
}

/**
 * How busy the computer Jarvis runs on is. Mounted only while Shown, so it
 * stops measuring when Hidden. Each refresh waits for the last one, so a slow
 * server never piles requests up; an unreachable one keeps being retried.
 */
export function SystemWidget() {
  /** Undefined until the first answer; null when the server can't be reached. */
  const [status, setStatus] = useState<SystemStatus | null>()

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    async function refresh() {
      const next = await loadStatus()
      if (!active) return
      setStatus(next)
      timer = setTimeout(refresh, REFRESH_MS)
    }
    void refresh()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [])

  if (status === undefined) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {status === null ? (
        <p className="text-sm text-muted-foreground">
          No se puede contactar con Jarvis
        </p>
      ) : status.machine === null ? (
        <p className="text-sm text-muted-foreground">
          No pude leer el ordenador
        </p>
      ) : (
        <>
          <Meter
            label="CPU"
            value={formatPercent(status.machine.cpu.percent)}
            percent={status.machine.cpu.percent}
          />
          <Meter
            label="RAM"
            value={formatMemory(status.machine.memory)}
            percent={
              (status.machine.memory.usedBytes /
                status.machine.memory.totalBytes) *
              100
            }
          />
          {status.machine.battery && (
            <Meter
              label="Batería"
              value={formatPercent(status.machine.battery.percent)}
              percent={status.machine.battery.percent}
              barClassName={
                status.machine.battery.charging
                  ? "bg-emerald-500"
                  : status.machine.battery.percent <= 20
                    ? "bg-red-500"
                    : undefined
              }
              badge={
                status.machine.battery.charging && (
                  <BatteryChargingIcon
                    className="size-4 text-emerald-600 dark:text-emerald-400"
                    aria-label="Cargando"
                  />
                )
              }
            />
          )}
        </>
      )}
    </div>
  )
}

/** One reading: its name and value, with a small bar below. */
function Meter({
  label,
  value,
  percent,
  barClassName,
  badge,
}: {
  label: string
  value: string
  percent: number
  barClassName?: string
  /** Shown before the value, e.g. that the battery is charging. */
  badge?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1 font-medium tabular-nums">
          {badge}
          {value}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={value}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500",
            barClassName
          )}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  )
}
