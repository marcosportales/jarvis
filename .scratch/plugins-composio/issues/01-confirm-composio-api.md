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

**Status:** done

- [x] Every point above answered with a link to Composio's docs (or marked "unconfirmed" with how to confirm it live once ticket 02 is done)
- [x] The final Composio port interface written down
- [x] Spec updated if any assumption changed

## Answer

Checked 2026-10-14 against Composio's docs and the installed SDK source (`@composio/core` 0.23.0, `node_modules/@composio/core/src`). **Nothing changes the Owner's workflow.** Three details change the port, and they're noted below.

### Account statuses and listing
- The SDK's enum has **seven** statuses: `INITIALIZING`, `INITIATED`, `ACTIVE`, `FAILED`, `EXPIRED`, `INACTIVE`, `REVOKED` (`src/types/connectedAccounts.types.ts`). The docs describe only `ACTIVE`, `INACTIVE` ("cannot execute tools") and `REVOKED` (set by `revoke()`) ([connected accounts](https://docs.composio.dev/docs/auth-configuration/connected-accounts)), plus `INITIATED` for a Connect Link that was never finished ([manually authenticating](https://docs.composio.dev/docs/authenticating-users/manually-authenticating)).
- Mapping, extending the spec: `REVOKED` counts with `EXPIRED`/`FAILED`/`INACTIVE` as **Reconnect**. `INITIALIZING` counts with `INITIATED` as not Installed.
- Listing: `composio.connectedAccounts.list({ userIds, toolkitSlugs, cursor })` returns `{ items: [{ id, status, toolkit: { slug } }], nextCursor }`. It's paginated, so the adapter follows the cursor.

### Authorizing with a callback
- `connectedAccounts.initiate()` (and `toolkits.authorize()`, which wraps it) is **retired for Composio-managed OAuth** after 2026-07-03 (SDK docstring; [changelog](https://docs.composio.dev/docs/changelog/2026/04/24)). Instead: open a session for the toolkit, then call `session.authorize(toolkit, { callbackUrl })`. It creates a Connect Link on the session's auth config, which is Composio-managed when we have none of our own, and returns `{ id: connectedAccountId, redirectUrl }` with status `INITIATED`.
- The callback keeps our own query params ("while preserving your existing ones"), so `state` survives. Composio adds `status=success|failed` and `connected_account_id` ([manually authenticating](https://docs.composio.dev/docs/authenticating-users/manually-authenticating)). No `error` param is documented.
- Composio warns that callback params alone don't prove ownership. So the pending-install cookie also holds the `connectedAccountId` that `authorize` returned, and only that id is checked. The one in the query string is ignored.

### Get, delete, revoke
- `connectedAccounts.get(id)` returns `{ id, status, toolkit: { slug } }`. `connectedAccounts.delete(id)` deletes permanently.
- **Delete is not documented to revoke at Google**: the docs say nothing on it, and only the SDK docstring claims it "will revoke any access tokens". A separate `revoke()` is best-effort and leaves the account `REVOKED`. The spec leaves revocation to Composio, so Uninstall only deletes.

### Sessions and MCP
- `composio.sessions.create(userId, { toolkits, tools: { gmail: { enable: [...] } }, sessionPreset: "direct_tools", mcp: true })`. The direct-tools preset turns off the meta tools (search, multi-execute, manage-connections, sandbox) and preloads every allowed tool ([sessions via MCP](https://docs.composio.dev/docs/sessions-via-mcp); `src/types/toolRouter.types.ts`).
- `session.mcp` is `{ type, url, headers }`. The headers hold the API key the session was created with (`x-api-key` for a project key), and the docs say to pass them through unchanged and not to another origin.
- Over MCP, tools keep their Composio slugs: "Any MCP client pointed at that URL sees only `GMAIL_FETCH_EMAILS` and …" ([sessions via MCP](https://docs.composio.dev/docs/sessions-via-mcp)).
- `@ai-sdk/mcp`'s HTTP transport (Streamable HTTP) already takes arbitrary `headers`; today's Connector uses that option for its bearer token. **Unconfirmed live** that Composio's endpoint answers it. Confirm in ticket 05's manual check once ticket 02 is done.

### Gmail tool slugs
All five exist on the [Gmail toolkit page](https://docs.composio.dev/toolkits/gmail), and each description is read-only: `GMAIL_FETCH_EMAILS` ("Fetches a list of email messages"), `GMAIL_FETCH_MESSAGE_BY_THREAD_ID`, `GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID`, `GMAIL_LIST_LABELS`, `GMAIL_LIST_DRAFTS`. Gmail supports Composio-managed OAuth.

### The Composio port

The Owner's constant user id lives in the adapter, not in the port.

```ts
type ConnectedAccount = { id: string; toolkit: string; status: string }

type ComposioPort = {
  /** The Owner's connected accounts for these toolkits, every status. */
  listAccounts(toolkits: string[]): Promise<ConnectedAccount[]>
  /** Starts a Connect Link; the consent URL plus the new INITIATED account. */
  authorize(args: { toolkit: string; callbackUrl: string }):
    Promise<{ connectedAccountId: string; redirectUrl: string }>
  getAccount(id: string): Promise<ConnectedAccount>
  deleteAccount(id: string): Promise<void>
  /** A direct-tools session limited to these toolkits and tools. */
  openSession(args: { tools: Record<string, string[]> }):
    Promise<{ url: string; headers: Record<string, string> }>
}
```

A missing `COMPOSIO_API_KEY` means no port at all (`composio: null`), which the Plugins module shows as "No configurado".
