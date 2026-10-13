# 01: Confirm Google's Gmail MCP server against official docs

**What to build:** A short research note, appended to this ticket under `## Answer`, that confirms from Google's own documentation (not third-party guides) everything the Gmail Plugin's catalog entry needs: the MCP endpoint and transport, which Google APIs must be enabled, the OAuth endpoints, the narrowest OAuth scope that allows read-only use, and the list of tools the server exposes, split into read-only tools (to allowlist) and write tools (to exclude). Also note whether the server supports dynamic client registration and any preview/availability restrictions (e.g. allowlisting, test-user limits). If the server can't be confirmed or can't be used read-only, stop and flag ADR 0001 for revisiting — do not switch approach silently.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Endpoint, transport and required APIs confirmed with links to Google docs
- [x] OAuth endpoints and narrowest read-only scope identified, with links
- [x] Tool list captured, with a proposed read-only allowlist
- [x] Preview limitations and dynamic-client-registration support noted
- [x] If anything blocks the ADR 0001 approach, it is called out explicitly

## Answer

Confirmed from Google's own docs (fetched 2026-10-13). **ADR 0001 is not blocked**: the server is remote, uses OAuth, and can be used read-only. The one new prerequisite is a human one: the Owner must be enrolled in the Google Workspace Developer Preview Program (see below).

### Endpoint, transport, APIs
- Endpoint: `https://gmailmcp.googleapis.com/mcp/v1`, transport **Streamable HTTP** ([configure guide](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server), [MCP reference](https://developers.google.com/workspace/gmail/api/reference/mcp)).
- APIs to enable in the Cloud project: **Gmail API** (`gmail.googleapis.com`) and **Gmail MCP API** (`gmailmcp.googleapis.com`) ([configure guide](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server)).
- Auth: a bearer access token from standard Google OAuth 2.0. The OAuth client must be of type **Web application**.

### OAuth
- Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
- Token endpoint: `https://oauth2.googleapis.com/token`
- Revoke endpoint: `https://oauth2.googleapis.com/revoke`
- Use `access_type=offline` + `prompt=consent` to get a refresh token, and `state` for CSRF. A denied consent returns `?error=access_denied`. A revoked or expired refresh token returns `invalid_grant`, which means the Owner has to consent again ([OAuth for web server apps](https://developers.google.com/identity/protocols/oauth2/web-server)).
- **Narrowest read-only scope: `https://www.googleapis.com/auth/gmail.readonly`.** Every read tool lists it as sufficient ([search_threads](https://developers.google.com/workspace/gmail/api/reference/mcp/tools_list/search_threads), [get_thread](https://developers.google.com/workspace/gmail/api/reference/mcp/tools_list/get_thread), [get_message](https://developers.google.com/workspace/gmail/api/reference/mcp/tools_list/get_message), [list_labels](https://developers.google.com/workspace/gmail/api/reference/mcp/tools_list/list_labels), [list_drafts](https://developers.google.com/workspace/gmail/api/reference/mcp/tools_list/list_drafts)). `gmail.metadata` is narrower but can't return subjects, snippets or bodies, so it's useless for answering. Google's setup guide also requests `gmail.compose`; we don't, because it's only needed for drafts.

### Tools ([MCP reference](https://developers.google.com/workspace/gmail/api/reference/mcp))
- **Read-only allowlist** (each annotated `readOnlyHint: true`): `search_threads`, `get_thread`, `get_message`, `list_labels`, `list_drafts`
- **Excluded (write):** `create_draft`, `label_thread`, `unlabel_thread`, `label_message`, `unlabel_message`, `create_label`
- Google's pages disagree slightly on the list: `get_message` and `create_label` show up in the sidebar but not in every list. The allowlist is applied by name, so this doesn't matter. A tool missing from the server simply isn't offered.

### Preview limits and DCR
- **Developer Preview**: using the server requires membership in the [Google Workspace Developer Preview Program](https://developers.google.com/workspace/preview). This is an extra step for ticket 02.
- With an External consent screen, the Owner must be added as a test user. Google says nothing about a test-user cap for this server.
- **Dynamic client registration is not mentioned or supported.** All guides use a pre-created OAuth client ID and secret. This matches the spec's env-based credentials.
- Quotas: 6,000 query units per user per minute ([usage limits](https://developers.google.com/workspace/gmail/api/reference/quota)). Not a concern for one Owner.
- Google warns about indirect prompt injection from email content. Keeping Jarvis read-only limits the damage.

### Observed against the live server (2026-10-14)
- `tools/list` returned 23 tools, more than the docs list: `create_draft, list_drafts, get_draft, get_thread, get_message, search_threads, label_thread, unlabel_thread, apply_sensitive_thread_label, trash_thread, untrash_thread, mark_thread_spam, unmark_thread_spam, list_labels, label_message, update_message_labels, unlabel_message, apply_sensitive_message_label, trash_message, untrash_message, mark_message_spam, unmark_message_spam, create_label`. The name-based allowlist still exposes only the five read tools. `get_draft` is also read-only and could be added later.
- Listing tools works without Developer Preview enrollment, but every tool call returns `isError` until the **Cloud project** is enrolled.
