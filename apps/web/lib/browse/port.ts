import { Composio } from "@composio/core"
import { z } from "zod"

import { OWNER_USER_ID } from "../plugins/composio"

/** Composio's own task statuses; `started` means it is still running. */
export type BrowserStatus = "started" | "finished" | "stopped" | "failed"

/** Where a remote browser task is, as of one watch. */
export type BrowserWatch = {
  status: BrowserStatus
  /** The latest step number, to pass back as the last step seen. */
  step: number
  /** What it is trying to do now, in English; null with no new steps. */
  currentGoal: string | null
  currentUrl: string | null
  /** The latest new step's screenshot; null with no new steps. */
  screenshotUrl: string | null
  /** Only once it ended. */
  output: string | null
  /** Only once it finished, judged by Composio. */
  success: boolean | null
}

/**
 * What the Browse module needs from Composio's `browser_tool` toolkit, per
 * ticket 01. Every operation throws when Composio can't be reached or the
 * tool reports a failure. Never given `secrets`: Browse is read-only.
 */
export type BrowserPort = {
  start(task: {
    task: string
    startUrl?: string
  }): Promise<{ taskId: string; browserSessionId: string }>
  /** Waits up to about 30 s while the task runs, less once it ends. */
  watch(taskId: string, lastStep: number): Promise<BrowserWatch>
  /** Null once the remote browser is gone. */
  liveViewUrl(browserSessionId: string): Promise<string | null>
  /** Ends the task and frees its remote browser, also after it finished. */
  stop(taskId: string): Promise<void>
}

/** The toolkit version the fixtures were recorded with (ticket 01). */
export const BROWSER_TOOLKIT_VERSION = "20261006_00"

/** Watching a running task blocks about 30 s on Composio's side. */
const WATCH_TIMEOUT_MS = 45_000
const TIMEOUT_MS = 20_000

/** A browser tool that ran but reported a failure. */
export class BrowserFailedError extends Error {}

const watchSchema = z.object({
  status: z.enum(["started", "finished", "stopped", "failed"]),
  current_step: z.number().nullish(),
  current_goal: z.string().nullish(),
  current_url: z.string().nullish(),
  output: z.string().nullish(),
  isSuccess: z.boolean().nullish(),
  steps: z
    .array(
      z.object({
        number: z.number(),
        memory: z.string().nullish(),
        nextGoal: z.string().nullish(),
        screenshotUrl: z.string().nullish(),
      })
    )
    .nullish(),
})

/** The last line of a step's memory says what it will do next. */
function goalOf(step: { memory?: string | null; nextGoal?: string | null }) {
  if (step.nextGoal) return step.nextGoal
  const lines = (step.memory ?? "").split("\n").map((line) => line.trim())
  return lines.filter(Boolean).at(-1) ?? null
}

/** Reads a raw `BROWSER_TOOL_WATCH_TASK` response; throws if it can't. */
export function toBrowserWatch(data: unknown): BrowserWatch {
  const raw = watchSchema.parse(data)
  const latest = raw.steps?.at(-1)
  return {
    status: raw.status,
    step: raw.current_step ?? latest?.number ?? 0,
    currentGoal: raw.current_goal || (latest ? goalOf(latest) : null),
    currentUrl: raw.current_url || null,
    screenshotUrl: latest?.screenshotUrl ?? null,
    // Composio escapes the output's line breaks.
    output: raw.output?.replaceAll("\\n", "\n") ?? null,
    success: raw.isSuccess ?? null,
  }
}

const createdSchema = z.object({
  watch_task_id: z.string(),
  browser_session_id: z.string(),
})

const sessionSchema = z.object({ liveUrl: z.string().nullish() })

/**
 * The real port over `@composio/core`. `browser_tool` is `NO_AUTH`, so it
 * runs with no connected account. Without an API key every call fails.
 */
export function createComposioBrowserPort(
  apiKey: string | undefined
): BrowserPort {
  const composio = apiKey ? new Composio({ apiKey }) : null

  async function run(
    slug: string,
    args: Record<string, unknown>,
    timeoutMs = TIMEOUT_MS
  ) {
    if (!composio) throw new BrowserFailedError("COMPOSIO_API_KEY is not set")
    const response = await composio.tools.execute(
      slug,
      {
        userId: OWNER_USER_ID,
        version: BROWSER_TOOLKIT_VERSION,
        arguments: args,
      },
      { signal: AbortSignal.timeout(timeoutMs) }
    )
    if (!response.successful) {
      throw new BrowserFailedError(response.error ?? `${slug} failed`)
    }
    return response.data
  }

  return {
    async start({ task, startUrl }) {
      const created = createdSchema.parse(
        await run("BROWSER_TOOL_CREATE_TASK", {
          task,
          ...(startUrl ? { startUrl } : {}),
        })
      )
      return {
        taskId: created.watch_task_id,
        browserSessionId: created.browser_session_id,
      }
    },
    async watch(taskId, lastStep) {
      return toBrowserWatch(
        await run(
          "BROWSER_TOOL_WATCH_TASK",
          { taskId, lastStepSeen: lastStep },
          WATCH_TIMEOUT_MS
        )
      )
    },
    async liveViewUrl(browserSessionId) {
      const session = sessionSchema.parse(
        await run("BROWSER_TOOL_GET_SESSION", { sessionId: browserSessionId })
      )
      return session.liveUrl ?? null
    },
    async stop(taskId) {
      await run("BROWSER_TOOL_STOP_TASK", { taskId })
    },
  }
}
