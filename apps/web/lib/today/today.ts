const MINUTE_MS = 60 * 1000

/** What the Today Widget shows: the date with its weekday, and the time. */
export type TodayText = { date: string; time: string }

/**
 * `now` in Spanish, e.g. "martes, 14 de octubre de 2026" and "07:05", in
 * `timeZone`, or else the runtime's own, which in the browser is the Owner's.
 */
export function formatToday(now: Date, timeZone?: string): TodayText {
  const date = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(now)
  const time = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(now)
  return { date, time }
}

/** How long until the clock next turns over a minute. */
export function msUntilNextMinute(now: Date): number {
  return MINUTE_MS - (now.getTime() % MINUTE_MS)
}
