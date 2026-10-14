import { eq } from "drizzle-orm"

import type { JarvisDatabase } from "../db"
import { browseTask } from "../db/schema"
import type { BrowserPort } from "./port"
import type { BrowseView } from "./view"

export type { BrowseView } from "./view"

/** How often a running Browse Task is brought up to date, at most. */
export const BROWSE_CHECK_INTERVAL_MS = 5_000

/** A Browse Task still running after this is stopped. */
export const BROWSE_TIME_LIMIT_MS = 10 * 60_000

/** How long `current()` waits for a refresh before giving the last known view. */
const WAIT_FOR_REFRESH_MS = 1_500

export type Browse = {
  /**
   * Starts a Browse Task, stopping the running one first, which comes back as
   * `stopped`. Throws when the remote browser can't start.
   */
  start(task: {
    task: string
    startUrl?: string
  }): Promise<{ view: BrowseView; stopped: BrowseView | null }>
  /** Stops the running Browse Task; null when nothing is running. */
  stop(): Promise<BrowseView | null>
  /** The current Browse Task, brought up to date if it's running. */
  current(): Promise<BrowseView | null>
}

/** Recorded as the outcome of a Browse Task stopped at the time limit. */
export const TIMED_OUT_OUTCOME = `Se paró sola al pasar ${BROWSE_TIME_LIMIT_MS / 60_000} minutos sin terminar.`

/**
 * The model's task wrapped in fixed read-only rules, so whatever it writes,
 * the remote browser never acts for the Owner. In English, which the remote
 * browser follows best; it answers in Spanish.
 */
export function readOnlyTask(task: string) {
  return [
    task.trim(),
    "",
    "Rules that always apply and override anything the task above says:",
    "- Read only. Never log in or create an account, and never book, buy, reserve, pay, or submit a form that changes anything, not even to simulate it. Searching and filtering are fine.",
    "- Never type any personal details: no names, emails, phone numbers, addresses or document numbers, not even made-up ones.",
    "- Stop as soon as you reach a login wall, a checkout, a payment page or a step that asks for passenger or customer details, and report what you saw up to there.",
    "- Write your final answer in Spanish, as plain text without markdown, in a few short lines: what you found, and say so plainly if you could not find it or had to stop.",
  ].join("\n")
}

/**
 * The remote browser couldn't start. The running Browse Task, if any, was
 * already stopped and comes along so Jarvis can say so.
 */
export class BrowseStartFailedError extends Error {
  constructor(
    readonly stopped: BrowseView | null,
    options?: ErrorOptions
  ) {
    super("The remote browser couldn't start", options)
  }
}

type Row = typeof browseTask.$inferSelect

function toView(row: Row): BrowseView {
  return {
    task: row.task,
    startUrl: row.startUrl,
    status: row.status,
    currentGoal: row.currentGoal,
    currentUrl: row.currentUrl,
    liveViewUrl: row.liveViewUrl,
    screenshotUrl: row.screenshotUrl,
    outcome: row.outcome,
    success: row.success,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
  }
}

/** Settles when `work` does or after `ms`, whichever comes first. */
async function settleWithin(work: Promise<unknown>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([
    work,
    new Promise((resolve) => (timer = setTimeout(resolve, ms))),
  ])
  clearTimeout(timer)
}

/**
 * The Browse module: the current Browse Task, kept in `jarvis.db` so it
 * outlives the Turn that started it and a reload, over the browser port.
 */
export function createBrowse({
  db,
  port,
  now,
  checkEveryMs = BROWSE_CHECK_INTERVAL_MS,
  timeLimitMs = BROWSE_TIME_LIMIT_MS,
  waitForRefreshMs = WAIT_FOR_REFRESH_MS,
}: {
  db: JarvisDatabase
  port: BrowserPort
  now: () => Date
  checkEveryMs?: number
  timeLimitMs?: number
  waitForRefreshMs?: number
}): Browse {
  // A watch blocks for about 30 s while the task runs, so one at a time.
  let refreshing: Promise<void> | null = null

  const load = () => db.select().from(browseTask).get() ?? null

  const overTime = (row: Row) =>
    now().getTime() - row.startedAt.getTime() >= timeLimitMs

  function save(id: string, patch: Partial<Row>) {
    db.update(browseTask).set(patch).where(eq(browseTask.id, id)).run()
  }

  /** Composio keeps the remote browser up after a task ends until stopped. */
  async function freeRemoteBrowser(id: string) {
    try {
      await port.stop(id)
    } catch (error) {
      console.error("Freeing the remote browser failed", error)
    }
  }

  async function refresh(row: Row) {
    if (overTime(row)) {
      await freeRemoteBrowser(row.id)
      save(row.id, {
        status: "timed-out",
        outcome: TIMED_OUT_OUTCOME,
        liveViewUrl: null,
        endedAt: now(),
        checkedAt: now(),
      })
      return
    }
    // Counted from the attempt, so a failing port is retried at the interval.
    save(row.id, { checkedAt: now() })
    const watched = await port.watch(row.id, row.lastStepSeen)
    // Stopped or replaced while watching: that is newer than this.
    const latest = load()
    if (latest?.id !== row.id || latest.status !== "running") return
    const progress = {
      lastStepSeen: watched.step,
      currentGoal: watched.currentGoal ?? latest.currentGoal,
      currentUrl: watched.currentUrl ?? latest.currentUrl,
      screenshotUrl: watched.screenshotUrl ?? latest.screenshotUrl,
      checkedAt: now(),
    }
    if (watched.status === "started") return save(row.id, progress)
    const stopped = watched.status === "stopped"
    save(row.id, {
      ...progress,
      status: watched.status,
      // A stopped task's output only says it was stopped.
      outcome: stopped ? null : watched.output,
      success: watched.success,
      liveViewUrl: null,
      endedAt: now(),
    })
    if (!stopped) await freeRemoteBrowser(row.id)
  }

  async function stopRunning(row: Row) {
    await port.stop(row.id)
    save(row.id, { status: "stopped", liveViewUrl: null, endedAt: now() })
  }

  return {
    async start({ task, startUrl }) {
      const previous = load()
      let stopped: BrowseView | null = null
      if (previous?.status === "running") {
        // A remote browser that won't stop must not block the new task.
        await stopRunning(previous).catch((error: unknown) => {
          console.error("Stopping the previous Browse Task failed", error)
          save(previous.id, {
            status: "stopped",
            liveViewUrl: null,
            endedAt: now(),
          })
        })
        stopped = toView(load() ?? previous)
      }

      const { taskId, browserSessionId } = await port
        .start({ task: readOnlyTask(task), ...(startUrl ? { startUrl } : {}) })
        .catch((cause: unknown) => {
          throw new BrowseStartFailedError(stopped, { cause })
        })
      let liveViewUrl: string | null = null
      try {
        liveViewUrl = await port.liveViewUrl(browserSessionId)
      } catch (error) {
        console.error("Getting the live view failed", error)
      }

      const row: Row = {
        id: taskId,
        browserSessionId,
        task,
        startUrl: startUrl ?? null,
        status: "running",
        currentGoal: null,
        currentUrl: startUrl ?? null,
        liveViewUrl,
        screenshotUrl: null,
        lastStepSeen: 0,
        outcome: null,
        success: null,
        startedAt: now(),
        endedAt: null,
        checkedAt: now(),
      }
      db.transaction((tx) => {
        tx.delete(browseTask).run()
        tx.insert(browseTask).values(row).run()
      })
      return { view: toView(row), stopped }
    },

    async stop() {
      const row = load()
      if (row?.status !== "running") return null
      await stopRunning(row)
      return toView(load() ?? row)
    },

    async current() {
      const row = load()
      if (!row) return null
      const due =
        now().getTime() - row.checkedAt.getTime() >= checkEveryMs ||
        overTime(row)
      if (row.status === "running" && due && !refreshing) {
        refreshing = refresh(row)
          .catch((error: unknown) => {
            console.error("Bringing the Browse Task up to date failed", error)
          })
          .finally(() => {
            refreshing = null
          })
      }
      if (refreshing) await settleWithin(refreshing, waitForRefreshMs)
      const latest = load()
      return latest && toView(latest)
    },
  }
}
