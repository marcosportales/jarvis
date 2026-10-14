# 01: Confirm Composio's browser tool with one live Browse Task

**What to build:** A written check, appended to this ticket under `## Answer`, of everything the spec assumes about Composio's `browser_tool` toolkit (`BROWSER_TOOL_CREATE_TASK`, `BROWSER_TOOL_WATCH_TASK`, `BROWSER_TOOL_GET_SESSION`, `BROWSER_TOOL_STOP_TASK`). Run **one small, read-only task** through `@composio/core` with the existing `COMPOSIO_API_KEY` (e.g. "find the opening hours on museodelprado.es"), then one more that you stop halfway. This spends Composio credits, so keep it to those two. Save trimmed responses as fixtures for the Browse module tests. Finish by writing down the final shape of the **browser port**. If any assumption is wrong in a way that changes what the Owner gets, stop and update the spec instead of working around it.

Check:
- The real inputs and outputs of each tool: task and remote browser session ids, statuses, current goal and URL, steps, screenshot URLs, output text and success flag.
- How long the simple task takes from start to finish, and how many credits it used.
- That `GET_SESSION` returns a live view URL, and **whether that page can be embedded in an iframe** (`X-Frame-Options`, CSP `frame-ancestors`). Also check what the live view shows once the task has ended.
- How long screenshot URLs and the live view URL stay valid.
- That stopping works and what status it leaves.
- That `browser_tool` stays `NO_AUTH`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Every point above answered, with the calls made and what came back
- [x] Trimmed fixtures saved for create, watch (running and finished), get session and stop
- [x] The final browser port interface written down
- [x] A clear yes/no on embedding the live view, so ticket 03 knows which rendering path ships
- [x] Spec updated if any assumption changed

## Answer

Checked live on 2026-10-14 through `@composio/core` 0.23.0, using `composio.tools.execute(slug, { userId: "jarvis-owner", version: "20261006_00", arguments })` with the existing `COMPOSIO_API_KEY`. The toolkit is `browser_tool`, version `20261006_00`, with five tools: the four the spec uses plus `BROWSER_TOOL_GET_OUTPUT_FILE`, which Browse doesn't need. Its only auth scheme is `NO_AUTH`, and every call ran with no connected account. Trimmed responses are in `apps/web/lib/browse/fixtures.ts`.

### Calls made

| Call | Arguments | Time | What came back |
|---|---|---|---|
| `CREATE_TASK` | `task: "Find the opening hours of the Museo del Prado today…"`, `startUrl: https://www.museodelprado.es` | 1.2 s | `{ watch_task_id, browser_session_id }` |
| `GET_SESSION` | `sessionId` | 0.9 s | `{ id, status: "active", liveUrl: "https://live.browser-use.com?wss=https%3A%2F%2F<session>.cdp.browser-use.com" }` |
| `WATCH_TASK` | `lastStepSeen: 0` | **32.3 s** | `status: "started"`, `current_step: 7`, 7 steps |
| `WATCH_TASK` | `lastStepSeen: 7` | **17.6 s** | `status: "finished"`, `isSuccess: true`, `output` in Spanish, steps 8–10 |
| `GET_SESSION` | after finishing | 1.1 s | still `status: "active"` with the same `liveUrl` |
| `STOP_TASK` | the finished task | 1.0 s | `{ status: "finished", message: "Task and session stopped successfully" }` |
| `GET_SESSION` | after that stop | 0.9 s | `{ status: "stopped", liveUrl: null }` |
| `WATCH_TASK` | the finished task, `lastStepSeen: 10` | 0.7 s | `status: "finished"`, no new steps |
| `WATCH_TASK` | unknown task id | 2.5 s | `successful: false`, `error: '{"detail":"Task not found"}'` |
| `CREATE_TASK` | `task: "Go to renfe.com and find what trains run from Madrid to Barcelona tomorrow morning…"`, `startUrl: https://www.renfe.com` | 1.3 s | ids |
| `WATCH_TASK` | `lastStepSeen: 0` | **32.2 s** | `status: "started"`, `current_step: 6` |
| `STOP_TASK` | the running task | 0.7 s | `{ status: "stopped", message: "Task and session stopped successfully" }` |
| `WATCH_TASK` | after stopping | 0.8 s | `status: "stopped"`, `output: "Agent stopped by user"`, `isSuccess: null` |
| `GET_SESSION` | after stopping | 0.8 s | `{ status: "stopped", liveUrl: null }` |

### Inputs and outputs

- **Create**: `task` (required, at least 10 characters), `startUrl`, `sessionId` (to reuse a browser, not used), `secrets` (never passed). Returns `watch_task_id` (the task id for watch and stop) and `browser_session_id` (for get session).
- **Watch**: `taskId`, `lastStepSeen` (only steps after it come back). Returns `id`, `status` (`started | finished | stopped | failed`), `current_step`, `current_url`, `current_goal`, `steps[]`, `output` (set once ended), `isSuccess` (set once finished, judged by Composio), `outputFiles[]`.
- Each step has `number`, `url`, `actions[]` (JSON strings), `memory`, `nextGoal`, `evaluationPreviousGoal`, `duration` and `screenshotUrl`.
- **Get session**: `sessionId`. Returns `id`, `status` (`active | stopped`), `liveUrl` (null once stopped).
- **Stop**: `taskId`. Returns `id`, `status` (the task's status afterwards) and `message`.
- A tool that runs but fails resolves with `successful: false` and an `error`. It doesn't throw.

### What differs from the spec

- **`current_goal` and every step's `nextGoal` came back empty** in both tasks. What the remote browser is doing is in each step's `memory`, in English, and its last line says what it does next ("I will accept the cookies… and then search for the "Visit" or "Opening hours" section"). The port uses `current_goal`, then `nextGoal`, then the last line of the latest step's `memory`. The Widget shows it as it comes, in English. Jarvis translates it when asked. The spec now says so.
- **Watching a running task blocks for about 30 s** (32.3 s and 32.2 s on a first watch). It returns early when the task ends (17.6 s) and at once for a task that already ended (0.7 s). A Turn or a poll can't wait for that. So `current()` waits only a moment for a refresh and otherwise gives the last known view while the refresh finishes in the background, and there is only one refresh at a time. While a task runs, the goal, URL and screenshot change about every 30 s. The live view is truly live. The spec now says so.
- **The remote browser stays up after a task finishes** (`GET_SESSION` still `active`). Stopping a finished task frees it and leaves the task `finished`. The Browse module stops the task once it sees it end, so no remote browser is left running.
- **The output's line breaks come back escaped** as a backslash and an `n`. The port restores them.
- A stopped task's `output` is "Agent stopped by user". It isn't an outcome, so the Browse module doesn't keep it.

### Timing and cost

- The Prado task took **about 60 s** from create to finished (10 steps), including a Cloudflare check. The Renfe task was stopped after 6 steps, at 39 s.
- Composio meters `browser_tool` per tool call, like Search. `composio.experimental.usage.breakdown("tool_calls")` counted each create, watch, get session and stop as one call. The Prado task was 5 calls and the stopped one 5 too. The project's `instantCharge` for the period was `"0"`. No separate browser credit shows up through the API, so if Composio bills the browser minutes itself, that only shows on the dashboard. Because each running watch takes about 30 s, a refreshing Browse Task costs about 2 calls a minute however often the client polls.

### Live view

- `liveUrl` is `https://live.browser-use.com?wss=…`, a page served by Vercel with **no `X-Frame-Options` and no CSP `frame-ancestors`** (headers checked on two sessions). **Yes, it can be embedded in an iframe.** Ticket 03 ships the iframe, sandboxed with `allow-scripts allow-same-origin`, which the page's script and its WebSocket stream need.
- The page is static. It streams the remote browser over the WebSocket in its `wss` parameter. After the task finishes, the remote browser stays up and the live view keeps showing the last page. Once stopped, the stream endpoint answers 502, `GET_SESSION` gives `liveUrl: null`, and the page has nothing to show. Since the Browse module stops each task once it ends, the Widget shows the last step's screenshot for an ended task, not the iframe.
- Screenshot URLs are public S3 objects behind CloudFront (`cdn.browser-use.com/screenshots/<task>/<step>.png`), not presigned. They have no expiry and still loaded after the session was stopped, so they stay valid at least as long as the Browse Task is kept. The live view URL is only valid while the remote browser is up.

### Stopping

`STOP_TASK` on a running task returned `status: "stopped"` at once. A later watch said `stopped`, with `output: "Agent stopped by user"` and `isSuccess: null`, and the live view was gone. On a finished task it frees the browser and the status stays `finished`.

### The browser port

```ts
type BrowserStatus = "started" | "finished" | "stopped" | "failed"

type BrowserWatch = {
  status: BrowserStatus
  step: number                 // pass back as lastStep
  currentGoal: string | null   // current_goal, else nextGoal, else the last line of the latest step's memory
  currentUrl: string | null
  screenshotUrl: string | null // the latest new step's
  output: string | null        // line breaks restored
  success: boolean | null
}

type BrowserPort = {
  start(task: { task: string; startUrl?: string }): Promise<{ taskId: string; browserSessionId: string }>
  watch(taskId: string, lastStep: number): Promise<BrowserWatch> // up to ~30 s while running
  liveViewUrl(browserSessionId: string): Promise<string | null>
  stop(taskId: string): Promise<void>
}
```

The real port (`apps/web/lib/browse/port.ts`) pins version `20261006_00`, never passes `secrets`, gives the watch a 45 s timeout (20 s for the others), and turns `successful: false` into a thrown `BrowserFailedError`.
