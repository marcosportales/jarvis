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

**Status:** ready-for-agent

- [ ] Every point above answered, with the calls made and what came back
- [ ] Trimmed fixtures saved for create, watch (running and finished), get session and stop
- [ ] The final browser port interface written down
- [ ] A clear yes/no on embedding the live view, so ticket 03 knows which rendering path ships
- [ ] Spec updated if any assumption changed
