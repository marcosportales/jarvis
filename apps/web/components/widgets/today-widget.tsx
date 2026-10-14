"use client"

import { useEffect, useState } from "react"

import { formatToday, msUntilNextMinute } from "@/lib/today/today"

/**
 * Today's date and the time, in the browser's time zone, which is the
 * Owner's. Ticks on each minute boundary, so the date rolls over at midnight.
 */
export function TodayWidget() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    // Each tick aims at the next boundary afresh, so delays never add up.
    function scheduleFrom(current: Date) {
      timer = setTimeout(tick, msUntilNextMinute(current))
    }
    function tick() {
      const current = new Date()
      setNow(current)
      scheduleFrom(current)
    }
    // A background tab's timers are throttled; catch up when it's back.
    function onVisible() {
      if (document.visibilityState !== "visible") return
      clearTimeout(timer)
      tick()
    }
    scheduleFrom(new Date())
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  const { date, time } = formatToday(now)
  return (
    <div className="flex flex-col gap-1">
      <time
        dateTime={now.toISOString()}
        className="text-3xl font-semibold tabular-nums"
      >
        {time}
      </time>
      <p>{date}</p>
    </div>
  )
}
