/**
 * Composio `browser_tool` responses recorded on 2026-10-14 (ticket 01), with
 * steps trimmed to a few, and a fake browser port for tests.
 */

import type { BrowserPort, BrowserWatch } from "./port"

/** Recorded from BROWSER_TOOL_CREATE_TASK, start URL museodelprado.es. */
export const CREATED = {
  browser_session_id: "ba4d82bd-bba4-49c2-a798-a044de1fc8fc",
  watch_task_id: "6916c565-dc4f-4317-80e4-177808ac1811",
}

/** Recorded from BROWSER_TOOL_GET_SESSION while the task ran. */
export const SESSION_ACTIVE = {
  id: "ba4d82bd-bba4-49c2-a798-a044de1fc8fc",
  liveUrl:
    "https://live.browser-use.com?wss=https%3A%2F%2Fba4d82bd-bba4-49c2-a798-a044de1fc8fc.cdp.browser-use.com",
  status: "active",
}

/** Recorded from BROWSER_TOOL_GET_SESSION once the task was stopped. */
export const SESSION_STOPPED = {
  id: "ba4d82bd-bba4-49c2-a798-a044de1fc8fc",
  liveUrl: null,
  status: "stopped",
}

/**
 * Recorded from BROWSER_TOOL_WATCH_TASK with `lastStepSeen: 0`, 38 s in.
 * `current_goal` and each step's `nextGoal` came back empty all along; what
 * the remote browser is doing is in each step's `memory`, in English.
 */
export const WATCH_RUNNING = {
  current_goal: "",
  current_step: 7,
  current_url: "https://www.museodelprado.es/",
  id: "6916c565-dc4f-4317-80e4-177808ac1811",
  isSuccess: null,
  output: null,
  outputFiles: [],
  status: "started",
  steps: [
    {
      actions: ['{"wait": {"seconds": 5}}'],
      duration: 3.53,
      evaluationPreviousGoal: "",
      memory:
        "The previous attempt to navigate to the official website was met with a Cloudflare security verification.\nI will wait a few seconds to see if the verification completes automatically or if I can interact with the challenge.",
      nextGoal: "",
      number: 1,
      screenshotUrl:
        "https://cdn.browser-use.com/screenshots/6916c565-dc4f-4317-80e4-177808ac1811/1.png",
      url: "https://www.museodelprado.es/",
    },
    {
      actions: ['{"click": {"index": 1058}}', '{"wait": {"seconds": 2}}'],
      duration: 3.3,
      evaluationPreviousGoal: "",
      memory:
        'The initial scroll didn\'t reveal the opening hours, but it did reveal a cookie consent banner.\nI will accept the cookies to clear the view and then search for the "Visit" or "Opening hours" section, preferably in Spanish as requested.',
      nextGoal: "",
      number: 7,
      screenshotUrl:
        "https://cdn.browser-use.com/screenshots/6916c565-dc4f-4317-80e4-177808ac1811/7.png",
      url: "https://www.museodelprado.es/",
    },
  ],
}

/**
 * Recorded from BROWSER_TOOL_WATCH_TASK with `lastStepSeen: 7`, 60 s in. The
 * output's line break came back escaped, as a backslash and an `n`.
 */
export const WATCH_FINISHED = {
  current_goal: "",
  current_step: 10,
  current_url: "https://www.museodelprado.es/",
  id: "6916c565-dc4f-4317-80e4-177808ac1811",
  isSuccess: true,
  output:
    "El Museo del Prado abre hoy de lunes a sábado de 10:00 h a 20:00 h.\\nLos domingos y festivos el horario es de 10:00 h a 19:00 h.",
  outputFiles: [],
  status: "finished",
  steps: [
    {
      actions: [
        '{"done": {"text": "El Museo del Prado abre hoy de lunes a s\\u00e1bado de 10:00 h a 20:00 h.", "success": true, "files_to_display": []}}',
      ],
      duration: 11.05,
      evaluationPreviousGoal: "",
      memory:
        'The previous action navigated to the "Entradas" (Tickets) page which conveniently lists the general "HORARIOS DE APERTURA" at the bottom.\nToday is Wednesday, Oct 14, 2026. According to the page, the museum is open from Monday to Saturday from 10:00 to 20:00.',
      nextGoal: "",
      number: 10,
      screenshotUrl:
        "https://cdn.browser-use.com/screenshots/6916c565-dc4f-4317-80e4-177808ac1811/10.png",
      url: "https://www.museodelprado.es/",
    },
  ],
}

/** Recorded from BROWSER_TOOL_WATCH_TASK right after stopping a renfe.com task. */
export const WATCH_STOPPED = {
  current_goal: "",
  current_step: 6,
  current_url: "https://www.renfe.com/es/en",
  id: "232f7309-0120-4325-a824-0faa48413930",
  isSuccess: null,
  output: "Agent stopped by user",
  outputFiles: [],
  status: "stopped",
  steps: [],
}

/** Recorded from BROWSER_TOOL_STOP_TASK on a running task. */
export const STOPPED = {
  id: "232f7309-0120-4325-a824-0faa48413930",
  message: "Task and session stopped successfully",
  status: "stopped",
}

/** Recorded from BROWSER_TOOL_STOP_TASK on a finished task: it frees the remote browser. */
export const STOPPED_AFTER_FINISHING = {
  id: "6916c565-dc4f-4317-80e4-177808ac1811",
  message: "Task and session stopped successfully",
  status: "finished",
}

/** Recorded from BROWSER_TOOL_WATCH_TASK for an unknown task: `successful: false`. */
export const WATCH_UNKNOWN_TASK_ERROR = '{"detail":"Task not found"}'

/** A watch result for tests, running unless told otherwise. */
export function watch(overrides: Partial<BrowserWatch> = {}): BrowserWatch {
  return {
    status: "started",
    step: 1,
    currentGoal: "I will open the opening hours page.",
    currentUrl: "https://www.museodelprado.es/",
    screenshotUrl: "https://cdn.browser-use.com/screenshots/task-1/1.png",
    output: null,
    success: null,
    ...overrides,
  }
}

/**
 * A browser port serving the watch results in order, the last one repeating,
 * and recording every call. Each operation fails while its `fail*` flag is
 * set.
 */
export function fakeBrowserPort(watches: BrowserWatch[] = [watch()]) {
  const calls = {
    start: [] as Parameters<BrowserPort["start"]>[0][],
    watch: [] as { taskId: string; lastStep: number }[],
    liveView: [] as string[],
    stop: [] as string[],
  }
  const failures = {
    start: false,
    watch: false,
    liveView: false,
    stop: false,
  }
  let started = 0
  let watched = 0
  const port: BrowserPort = {
    async start(task) {
      calls.start.push(task)
      if (failures.start) throw new Error("Composio is down")
      started++
      return {
        taskId: `task-${started}`,
        browserSessionId: `browser-${started}`,
      }
    },
    async watch(taskId, lastStep) {
      calls.watch.push({ taskId, lastStep })
      if (failures.watch) throw new Error("Composio is down")
      const next = watches[Math.min(watched++, watches.length - 1)]
      if (!next) throw new Error("no scripted watch result")
      return next
    },
    async liveViewUrl(browserSessionId) {
      calls.liveView.push(browserSessionId)
      if (failures.liveView) throw new Error("Composio is down")
      return `https://live.browser-use.com?wss=${browserSessionId}`
    },
    async stop(taskId) {
      calls.stop.push(taskId)
      if (failures.stop) throw new Error("Composio is down")
    },
  }
  return { port, calls, failures }
}
