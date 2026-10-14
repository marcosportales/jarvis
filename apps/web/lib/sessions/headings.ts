const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
]

const relative = new Intl.RelativeTimeFormat("es", { numeric: "always" })

/** How long ago, e.g. "hace 2 días"; "ahora" under a minute. */
export function relativeDate(date: Date, now: Date) {
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000)
  for (const [unit, size] of UNITS) {
    if (seconds >= size)
      return relative.format(-Math.floor(seconds / size), unit)
  }
  return "ahora"
}

const dateFormat = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

/** The Session Title, or the Session's date while it has none. */
export function sessionHeading({
  title,
  createdAt,
}: {
  title: string | null
  createdAt: Date
}) {
  return title ?? `Sesión del ${dateFormat.format(createdAt)}`
}
