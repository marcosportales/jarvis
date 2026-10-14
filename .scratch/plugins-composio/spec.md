# Spec: Plugins through Composio

Status: ready-for-agent

## Problem Statement

The Gmail Plugin is built and tested, but the Owner can't use it against their real inbox. Google's Gmail MCP server only answers for Google Cloud projects enrolled in the Workspace Developer Preview Program, and the Owner can't get in. Every tool call fails, so Jarvis can't answer "¿Tengo correos sin leer de hoy?". And for every future Plugin, the direct approach would mean another OAuth client, another consent screen, and another preview program to wait on.

## Solution

Jarvis reaches outside services through Composio, a managed integration platform that holds the Owner's authorizations and exposes each service's tools to Jarvis (ADR 0005, replacing ADR 0001). The `/plugins` page and its workflow stay the same for the Owner: the Marketplace lists Gmail; Install sends them through Google's consent screen (now Composio's verified Google app) and back; Gmail shows Connected; Jarvis answers from the real inbox, still read-only. Uninstall and Reconnect work as before. The only setup is one Composio API key in env, and no Google Cloud project is needed anymore.

## User Stories

### Marketplace

1. As the Owner, I want `/plugins` to keep listing every Plugin in the Marketplace with its name and icon, so that nothing changes in how I find Plugins.
2. As the Owner, I want each Plugin to show Conectado, Desconectado or Disponible exactly as before, so that I know what Jarvis can use right now.
3. As the Owner, I want every Plugin to show "No configurado" when the Composio API key is missing from env, so that I know setup is incomplete instead of seeing a failure on click.
4. As the Owner, I want the page to tell me Composio could not be reached rather than crash, so that a Composio outage doesn't break the page.
5. As the Owner, I want the Marketplace to stay a fixed list chosen in code, so that Jarvis never gains access to a service nobody reviewed.

### Install and Reconnect

6. As the Owner, I want Install to take me straight to the service's consent screen and back to `/plugins`, so that installing is still one action.
7. As the Owner, I want to install Gmail without creating a Google Cloud project, OAuth client or Developer Preview enrollment, so that the Plugin actually works for me.
8. As the Owner, I want a cancelled or failed consent to leave the Plugin Disponible, with the same clear message as today, so that there's no half-installed state.
9. As the Owner, I want a consent screen I opened but never finished not to count as Installed, so that abandoned attempts don't show up as Plugins.
10. As the Owner, I want a return to the callback that didn't come from my own Install to be rejected, so that nobody can attach their account to my Jarvis.
11. As the Owner, I want a Plugin whose authorization stopped working (expired, failed or disabled at Composio) to show Desconectado with Reconectar, so that I can restore access in one click.
12. As the Owner, I want Reconectar to leave me with a single working connection, so that stale broken connections don't pile up.
13. As the Owner, I want access I revoke elsewhere (in my Google account or the Composio dashboard) to show on `/plugins` the next time I open it, so that the page never claims access Jarvis no longer has.

### Uninstall

14. As the Owner, I want Uninstall to delete the Plugin's connection at Composio, so that Jarvis loses access right away.
15. As the Owner, I want Uninstall to work even if the Plugin was already Desconectado, so that I can always clean up.

### Talking to Jarvis about Gmail

16. As the Owner, I want to ask about my email by voice or text and get an answer from my real inbox, so that I don't have to open Gmail.
17. As the Owner, I want Jarvis to keep summarising email as before (senders by name, no addresses or links, a count plus the top two or three), so that Replies stay short and listenable.
18. As the Owner, I want follow-ups ("¿y qué decía el de Ana?") to keep working, so that I can drill into a result.
19. As the Owner, I want Jarvis to stay read-only on Gmail (search, read threads and messages, list labels and drafts), even though Composio could send, draft, label or trash, so that Jarvis never acts on my mail without a policy for it.
20. As the Owner, I want Jarvis to say it has no access to Gmail when the Plugin isn't Connected, rather than inventing an answer.
21. As the Owner, I want Jarvis to tell me in one sentence that I should reconnect Gmail when its connection is Desconectado, so that I know how to fix it.
22. As the Owner, I want Jarvis to tell me in one sentence when Gmail or Composio fails mid-Turn, so that the Turn still ends with a Reply.
23. As the Owner, I want the orb to stay Thinking while Jarvis consults Gmail, as today.

### Setup

24. As the Owner, I want setup to be one Composio account and one API key in the local env file, so that adding Plugins later needs no per-service setup.
25. As the Owner, I want the old Google credentials and stored Google tokens to be gone, so that nothing unused holds access to my account.

## Implementation Decisions

### Domain

- The vocabulary in `CONTEXT.md` doesn't change: Marketplace, Plugin, Connector, Installed, Connected, Reconnect. The Owner's workflow and the `/plugins` page behave as in the Gmail spec.
- ADR 0005 replaces ADR 0001: every Connector goes through Composio. The direct-Google path (our own OAuth client, Google's Gmail MCP server, tokens in SQLite) is removed, not kept next to it.

### Composio as the only record

- Composio is the only record of what is Installed. The local tables for Installed Plugins and their tokens are dropped by a migration. Jarvis keeps no tokens, only the Composio API key from env (`COMPOSIO_API_KEY`).
- The Owner is a single, constant Composio user id. There are no other users.
- A Plugin's state comes from Composio's connected accounts for the Plugin's toolkit:
  - any `ACTIVE` account → **Connected**
  - otherwise any `EXPIRED`, `FAILED` or `INACTIVE` account → **Reconnect** ("Desconectado")
  - only `INITIATED` accounts, or none → not Installed ("Disponible")
  - no API key in env → "No configurado" for every Plugin
- If Composio can't be reached when the Marketplace is listed, the page shows an error message instead of crashing.

### Catalog

- The Marketplace stays a fixed catalog in code, one file per Plugin. An entry now holds: id, name, icon, the **Composio toolkit slug**, and the read-only **tool allowlist** (Composio tool slugs). OAuth provider, scopes and MCP URL leave the catalog.
- Gmail: toolkit `gmail`, allowlist `GMAIL_FETCH_EMAILS`, `GMAIL_FETCH_MESSAGE_BY_THREAD_ID`, `GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID`, `GMAIL_LIST_LABELS`, `GMAIL_LIST_DRAFTS`. These cover the same abilities as today's five Google tools.
- Gmail uses Composio-managed auth (Composio's verified Google app), not our own Google app.
- Adding a Plugin is one catalog file and nothing else.

### The Composio port

- The Plugins module no longer depends on a token store and an OAuth client. Instead it depends on one injected **Composio port**, which offers what the module needs:
  - list the Owner's connected accounts with their toolkit and status
  - start authorizing a toolkit with a callback URL, which returns the consent URL
  - get one connected account's status
  - delete a connected account
  - open a session for one Turn, limited to given toolkits and allowed tools, which returns its MCP URL and headers
- The real adapter wraps the Composio TypeScript SDK (`@composio/core`). Tests use a fake.
- The Plugins module's public interface stays the same apart from removed token details: list the Marketplace, begin install, complete install, tools for a Turn, uninstall. The page, server actions, callback route and Reply endpoint need few or no changes.

### Install, Reconnect, Uninstall

- Begin install: a fresh random `state`, kept in the same httpOnly pending-install cookie as today, and also added as a query param to the callback URL given to Composio. The Owner is redirected to the consent URL Composio returns.
- Complete install: the callback checks the cookie against `state` as today, then asks Composio for the account's status. Only `ACTIVE` counts as installed. A provider error or a non-active account is "cancelled" or "failed", and the INITIATED account it left behind is deleted. After a successful Install or Reconnect, the toolkit's other accounts that don't work are deleted.
- Uninstall deletes every connected account of the Plugin's toolkit at Composio. Whether Composio also revokes the grant at the provider is up to Composio.

### Tools for a Turn

- Each Turn opens one Composio session limited to the toolkits of Connected Plugins, with only their allowlisted tools and Composio's built-in session tools turned off (the direct-tools preset). The existing MCP Connector connects to the session's MCP URL with its headers (no longer only a bearer token), and the allowlist is still applied by name as a second check.
- Tools reach the model under their Composio slugs (already prefixed by toolkit, e.g. `GMAIL_FETCH_EMAILS`); the `<plugin>_<tool>` renaming goes away. Nothing in the system prompt names tools.
- Plugins whose state is Reconnect add a model-facing notice telling Jarvis to ask the Owner to reconnect. Not-Installed Plugins add nothing.
- A Composio or Connector failure at session or tool-call time becomes a notice or a tool-result `{ error }` explaining it in one sentence, as today. It never fails the Turn, and it never changes a Plugin's state. Reconnect comes only from Composio's account status.
- The response contract to the client, the Jarvis Session controller and the Transcript are untouched.

### Code layout

- The Plugins code stays where it is. The Google OAuth client, the Google provider, the token store and the Google env vars are deleted. `@composio/core` is added to the web app.
- Read the bundled Next docs before touching routes or pages, per `AGENTS.md`.

## Testing Decisions

- **Seam: the Plugins module**, the same single seam as the Gmail spec. It's tested through its public interface with a fake Composio port and a fake Connector. No test talks to real Composio or Google. Tests assert what the Owner and the model see (Marketplace states, install results, tools offered, notices), not which port methods were called.
- Rework the existing Plugins module tests (Vitest, fake adapters) rather than writing new ones. Cases to cover:
  - each mapping from account statuses to Marketplace state, and "No configurado"
  - begin install returns Composio's consent URL with `state` in the callback
  - complete install: success, cancelled, `state` mismatch, an account that isn't active (and its cleanup), and removal of stale accounts on Reconnect
  - tools for a Turn: only allowlisted tools of Connected Plugins; a Reconnect notice; session or tool failures as explanations
  - uninstall removes every account of the toolkit
- Delete tests for token refresh, expiry and revocation. That behaviour now belongs to Composio.
- Manual acceptance against real Gmail:
  1. `/plugins` lists Gmail; Install → consent → Gmail shows Conectado.
  2. "¿Tengo correos sin leer de hoy?" by voice gets a 1–3 sentence answer from the real inbox.
  3. After Uninstall, the same question gets "No tengo acceso a tu Gmail" or equivalent.
  4. After revoking Composio's access in the Google account, `/plugins` shows Desconectado (once Composio notices) and Jarvis says to reconnect.

## Human setup (before acceptance)

- Create a Composio account and project, create an API key, and put it in `apps/web/.env.local` as `COMPOSIO_API_KEY`.
- Afterwards, remove `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from that file. Deleting the Google Cloud project's OAuth client is optional.

## Out of Scope

- New Plugins (Google Calendar is the natural next one, as its own change).
- Showing every Composio toolkit in the Marketplace, or letting the Owner add arbitrary entries.
- Any Gmail write action, or a confirm-before-acting policy.
- Our own Google app on Composio (custom auth config) for narrower scopes or our own branding.
- Composio triggers/webhooks; tool routing; showing tool activity in the Transcript.
- Plugin Widgets (ADR 0003), which now depend on Composio serving MCP Apps UI.

## Further Notes

- Composio's Google app asks for broader Gmail permissions than `gmail.readonly`; the allowlist is what keeps Jarvis read-only (ADR 0005).
- Free tier: 20k tool calls/month on Composio-managed apps, which is plenty for one Owner.
- First confirm against Composio's docs everything this spec assumes about the SDK: callback query params, account statuses, deleting an account, session MCP URL and headers with the direct-tools preset, tool names over MCP, and whether `@ai-sdk/mcp` accepts its headers. If an assumption is wrong, adjust the port, not the Owner's workflow.
