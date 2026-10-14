import { z } from "zod"

export const BROWSE_STATUSES = [
  "running",
  "finished",
  "failed",
  "stopped",
  "timed-out",
] as const

export type BrowseStatus = (typeof BROWSE_STATUSES)[number]

/** The current Browse Task as the Owner and Jarvis see it. */
export type BrowseView = {
  /** What was asked, as Jarvis wrote it. */
  task: string
  startUrl: string | null
  status: BrowseStatus
  /** What it is trying to do now, in English as Composio gives it. */
  currentGoal: string | null
  currentUrl: string | null
  /** Only while running; the remote browser is gone once it ends. */
  liveViewUrl: string | null
  /** The latest step's screenshot. */
  screenshotUrl: string | null
  /** What it found, once it finished or failed. */
  outcome: string | null
  /** Whether it did what was asked, once it finished. */
  success: boolean | null
  startedAt: Date
  endedAt: Date | null
}

/** A Browse Task view as it arrives over JSON, dates and all. */
export const browseViewSchema = z.object({
  task: z.string(),
  startUrl: z.string().nullable(),
  status: z.enum(BROWSE_STATUSES),
  currentGoal: z.string().nullable(),
  currentUrl: z.string().nullable(),
  liveViewUrl: z.string().nullable(),
  screenshotUrl: z.string().nullable(),
  outcome: z.string().nullable(),
  success: z.boolean().nullable(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
}) satisfies z.ZodType<BrowseView, unknown>

const ENDED_LABELS: Record<Exclude<BrowseStatus, "running">, string> = {
  finished: "Terminada",
  failed: "Ha fallado",
  stopped: "Parada",
  "timed-out": "Parada por tardar demasiado",
}

/** How an ended Browse Task is named, on screen and to Jarvis. */
export function endedLabel(view: BrowseView) {
  if (view.status === "running") return null
  return view.status === "finished" && view.success === false
    ? "Terminada sin conseguirlo"
    : ENDED_LABELS[view.status]
}

export const isRunning = (view: BrowseView | null) => view?.status === "running"

/** "renfe.com" for "https://www.renfe.com/es/en"; null if it isn't a URL. */
export function domainOf(url: string | null) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}
