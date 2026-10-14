# 05: Jarvis answers Gmail through a Composio session

**What to build:** The Owner asks "¿Tengo correos sin leer de hoy?" and Jarvis answers from the real inbox, still read-only.
- Each Turn opens one Composio session limited to the toolkits of Connected Plugins and their allowlisted tools, with Composio's built-in session tools turned off.
- The existing MCP Connector connects to the session's MCP URL with its headers, no longer only a bearer token. The allowlist is still applied by name as a second check.
- Tools reach the model under their Composio slugs (e.g. `GMAIL_FETCH_EMAILS`), without the `<plugin>_<tool>` renaming.
- A Plugin in Reconnect state adds a model-facing notice telling Jarvis to ask the Owner to reconnect it.
- A Composio or Connector failure at session or tool-call time becomes a one-sentence explanation (notice or tool result `{ error }`). It never fails the Turn and never changes a Plugin's state.
- The Reply endpoint's contract, the Jarvis Session controller and the Transcript are untouched. The email speaking rules in the system prompt stay as they are.

**Blocked by:** 03 (Marketplace shows Plugin states from Composio)

**Status:** ready-for-agent

- [ ] Only allowlisted tools of Connected Plugins are offered, under Composio slugs
- [ ] Plugins that aren't Installed contribute nothing; Reconnect Plugins contribute a notice
- [ ] Session and tool-call failures become explanations, never thrown errors, and don't change state
- [ ] Plugins module tests (fake Composio port + fake Connector) cover the above
- [ ] Manual (after 02 and 04): the question above, by voice, gets a 1–3 sentence answer from the real inbox
- [ ] Lint, typecheck and tests pass
