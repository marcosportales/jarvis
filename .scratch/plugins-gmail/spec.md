# Spec: Plugins — Marketplace with Gmail

Status: done

> **Superseded in part:** the Connector design here (our own Google OAuth client, Google's Gmail MCP server, tokens in SQLite) is replaced by `.scratch/plugins-composio/spec.md` (ADR 0005). The Owner's workflow and the `/plugins` page are unchanged.

## Problem Statement

Jarvis can only converse: it knows nothing about the Owner's world. The Owner wants to give Jarvis access to outside services (Gmail, Google Calendar, Linear, Slack…) the way a plugin marketplace works — pick a Plugin, authorize it, and from then on Jarvis can use that service when asked. This phase lays the groundwork for that with one Plugin: Gmail, read-only.

## Solution

A `/plugins` page shows the Marketplace: a fixed catalog of Plugins, today only Gmail. Clicking Install sends the Owner through Google OAuth; on return the Gmail Plugin is Installed and Connected. From then on, every Turn gives Jarvis the tools of every Connected Plugin, so asking "¿Tengo correos sin leer de hoy?" gets a short spoken answer drawn from the Owner's real inbox. The Owner can Uninstall the Plugin, and an expired or revoked authorization shows as Reconnect.

## User Stories

### Marketplace

1. As the Owner, I want a `/plugins` page listing every Plugin in the Marketplace, so that I can see what Jarvis could be given access to.
2. As the Owner, I want each Plugin to show whether it is Connected, needs Reconnect, or can be Installed, so that I know what Jarvis can use right now.
3. As the Owner, I want a Plugin whose OAuth credentials are missing from env to show as "not configured" instead of failing on click, so that I know setup is incomplete.
4. As the Owner, I want Install to take me straight to the service's OAuth consent and back, so that installing is one action.
5. As the Owner, I want a cancelled or failed OAuth to leave the Plugin not Installed, with a clear message, so that there's no half-installed state.
6. As the Owner, I want to Uninstall a Plugin, so that Jarvis loses access and its tokens are deleted (and revoked with the provider when possible).
7. As the Owner, I want a Plugin whose authorization stopped working to show Reconnect, so that I can restore access in one click.
8. As the Owner, I want Installed Plugins and their tokens to survive restarts, so that I authorize once.

### Talking to Jarvis about Gmail

9. As the Owner, I want to ask Jarvis about my email by voice or text and get an answer based on my real inbox, so that I don't have to open Gmail.
10. As the Owner, I want Jarvis to summarise rather than read emails verbatim — senders by name, no email addresses or links spoken, a count plus the top two or three when there are many — so that the Reply stays short and listenable.
11. As the Owner, I want to ask follow-ups ("¿y qué decía el de Ana?"), so that I can drill into a result.
12. As the Owner, I want the orb to stay Thinking while Jarvis consults Gmail, so that I know it's still working.
13. As the Owner, I want Jarvis to say it has no access to my Gmail when the Plugin isn't Connected, rather than inventing an answer.
14. As the Owner, I want Jarvis to tell me in one sentence when Gmail fails mid-Turn ("No pude acceder a Gmail; quizá debas reconectarlo"), so that the Turn still ends with a Reply.

## Implementation Decisions

### Domain

- Vocabulary (Marketplace, Plugin, Connector, Skill, Installed, Connected) is defined in `CONTEXT.md`; use it in code. Each Plugin has exactly one Connector this phase; Skills are not implemented.
- Install and connect are a single action. Installed-but-not-Connected only arises when a previously working authorization fails (shown as Reconnect).

### Connectors

- Per ADR 0001, every Connector is a **remote MCP server over HTTP, authorized with OAuth**. No stdio servers, no hand-written API tools.
- Gmail Connector: Google's official Gmail MCP server (reported endpoint `https://gmailmcp.googleapis.com/mcp/v1`, Developer Preview). **First task: confirm endpoint, required APIs, OAuth scopes and tool list against Google's own documentation** — so far these come only from a third-party guide. If it can't be confirmed or is unusable, stop and revisit ADR 0001 rather than switching approach silently.
- Gmail is **read-only** this phase: only search/read tools are exposed to Jarvis, even if the server offers draft/label tools. Request the narrowest OAuth scope that allows that. Any write capability needs a confirmation-before-acting policy, which is a separate design.
- Use the AI SDK MCP client (`@ai-sdk/mcp`) to list tools and call them.

### Catalog

- The Marketplace is a fixed catalog in code, one file per Plugin (e.g. `catalog/gmail.ts`): id, name, icon, MCP URL, OAuth provider/endpoints, scopes, tool allowlist.
- OAuth client credentials come from env per provider (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `apps/web/.env.local`). Missing credentials → Plugin shown as not configured.
- Adding a future Plugin should be one catalog file plus its env vars.

### Persistence

- Local SQLite in a gitignored file, accessed via Drizzle. Stores Installed Plugins and their OAuth tokens (access, refresh, expiry). Tokens are not encrypted — Jarvis runs locally for a single Owner; revisit before running anywhere else.
- Server-only; tokens never reach the browser.

### Reply with tools

- The Reply endpoint loads the tools of every Connected Plugin and passes them all to the chat model each Turn (no routing step). Bounded multi-step tool use (~5 steps). Nan's `deepseek-v4-flash` was verified to emit tool calls.
- The response contract to the client is unchanged: the full Reply text. The Jarvis Session controller and Transcript are untouched; tool calls are not shown in the Transcript.
- Token refresh happens transparently. An auth failure (refresh fails / revoked) marks the Plugin not Connected; any Connector failure is surfaced to the model so Jarvis explains it in one sentence — the Turn never fails with an inline error because of a Plugin.
- The system prompt gains guidance on speaking about email (rule from story 10) and on admitting when a service isn't Connected.

### Code layout

- New `apps/web/lib/plugins/` (catalog, persistence, OAuth, Connector/tool loading), separate from `lib/jarvis/`. Not a workspace package until a second app needs it.
- `/plugins` page and OAuth callback route in `apps/web/app/`. Read the bundled Next docs (`node_modules/next/dist/docs/`) before writing routes/pages, per `AGENTS.md`.

## Testing Decisions

- **Seam: the Reply's tool assembly.** Test the module that, given the Installed Plugins, produces the tool set for a Turn — with a fake Connector in place of a real MCP server. Assert: Connected Plugins' (allowlisted) tools are offered; non-Connected Plugins contribute nothing; a Connector failing at tool-load or tool-call time yields an explanation for the model rather than a thrown error; an auth failure marks the Plugin not Connected.
- No test touches real Gmail or Google OAuth.
- Manual acceptance (against real Gmail):
  1. `/plugins` lists Gmail; Install → Google OAuth → Gmail shows Connected.
  2. "¿Tengo correos sin leer de hoy?" (by voice) gets a 1–3 sentence spoken answer grounded in the real inbox.
  3. After Uninstall, the same question gets "No tengo acceso a tu Gmail" (or equivalent).
  4. After revoking access in the Google account, the next email question gets a one-sentence explanation and the Plugin shows Reconnect.

## Human setup (before acceptance)

- Join the Google Workspace Developer Preview Program. Create a Google Cloud project, enable the Gmail API and the Gmail MCP API, configure the OAuth consent screen (Owner as test user), create an OAuth client with the local callback URL, and put its credentials in `apps/web/.env.local`.

## Out of Scope

- Plugins other than Gmail; Skills.
- Sending, drafting, labelling or any write action in Gmail; a confirm-before-acting policy.
- Pasting arbitrary MCP URLs into the Marketplace.
- Tool routing / selecting Plugins per Turn.
- Showing tool activity in the Transcript.
- Token encryption, multiple Owners, deployment beyond local.

## Further Notes

- Google's Gmail MCP is in Developer Preview; expect changes. Keep everything Gmail-specific in its catalog file.
- Natural follow-ups: Google Calendar Plugin (same OAuth provider), write actions with Owner confirmation, Skills, tool routing once the tool count grows.
