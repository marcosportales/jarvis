"use client"

import { useEffect, useState, type ReactNode } from "react"
import { BatteryChargingIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import type { HealthReport } from "@/lib/health/health"
import {
  formatMemory,
  formatPercent,
  type SystemStatus,
} from "@/lib/system/status"

/** About how often the numbers refresh. */
const REFRESH_MS = 2_000

/** Null when Jarvis's server couldn't be reached. */
async function loadStatus({
  recheck = false,
} = {}): Promise<SystemStatus | null> {
  try {
    const response = await fetch(`/api/system${recheck ? "?recheck=1" : ""}`, {
      cache: "no-store",
    })
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
      <HealthButton
        health={status?.health ?? null}
        recheck={async () => {
          const next = await loadStatus({ recheck: true })
          setStatus(next)
        }}
      />
    </div>
  )
}

const LEVELS: Record<HealthReport["level"], { word: string; dot: string }> = {
  working: { word: "Funcionando", dot: "bg-emerald-500" },
  limited: { word: "Limitado", dot: "bg-amber-500" },
  down: { word: "Caído", dot: "bg-red-500" },
}

function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", className)}
    />
  )
}

/**
 * Jarvis Health as a coloured dot and its word. Opening it lists every part
 * and probes again; with the server unreachable, it's Down.
 */
function HealthButton({
  health,
  recheck,
}: {
  /** Null when Jarvis's server can't be reached. */
  health: HealthReport | null
  recheck: () => Promise<void>
}) {
  const [checking, setChecking] = useState(false)
  const level = LEVELS[health?.level ?? "down"]

  async function onOpenChange(open: boolean) {
    if (!open) return
    setChecking(true)
    try {
      await recheck()
    } finally {
      setChecking(false)
    }
  }

  return (
    <Popover onOpenChange={(open) => void onOpenChange(open)}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer justify-start gap-2"
          />
        }
      >
        <Dot className={level.dot} />
        <span>Jarvis: {level.word}</span>
      </PopoverTrigger>
      <PopoverContent side="left" align="start">
        <PopoverHeader>
          <PopoverTitle>Salud de Jarvis: {level.word}</PopoverTitle>
          <PopoverDescription aria-live="polite">
            {checking
              ? "Comprobando…"
              : health
                ? "Cada parte de Jarvis, comprobada ahora."
                : "No se puede contactar con Jarvis."}
          </PopoverDescription>
        </PopoverHeader>
        {health && (
          <ul className="flex flex-col gap-1.5">
            {health.parts.map((part) => (
              <li key={part.id} className="flex items-start gap-2">
                <Dot
                  className={cn(
                    "mt-1.5",
                    part.level === "working" ? "bg-emerald-500" : "bg-red-500"
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span>{part.label}</span>
                  {part.reason && (
                    <span className="text-xs text-muted-foreground">
                      {part.reason}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
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
