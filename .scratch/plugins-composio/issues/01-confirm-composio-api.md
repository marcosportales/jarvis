# 01: Confirm Composio's API against its own docs

**What to build:** A written check, appended to this ticket under `## Answer`, of everything the spec assumes about Composio's TypeScript SDK (`@composio/core`), taken from Composio's own docs with links. Finish by writing down the final shape of the **Composio port** the Plugins module will depend on. If any assumption is wrong in a way that changes the Owner's workflow, stop and update the spec instead of working around it.

Check:
- Statuses a connected account can have (`ACTIVE`, `INITIATED`, `EXPIRED`, `FAILED`, `INACTIVE`?), and how to list the Owner's accounts with their toolkit and status.
- How authorizing a toolkit with a callback URL works: does Composio keep the callback's own query params (our `state`), which params does it add on success or error, and does it use Composio-managed auth for Gmail with no auth config of ours?
- How to get one account's status and how to delete an account. Does deleting revoke the grant at Google?
- Sessions: limiting to toolkits and allowlisted tool slugs with the direct-tools preset (no built-in session tools), and the shape of `session.mcp` (URL, headers).
- Tool names as served over the session's MCP, and whether `@ai-sdk/mcp` can connect with those headers over Streamable HTTP.
- That the five Gmail slugs in the spec exist and are read-only.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every point above answered with a link to Composio's docs (or marked "unconfirmed" with how to confirm it live once ticket 02 is done)
- [ ] The final Composio port interface written down
- [ ] Spec updated if any assumption changed
