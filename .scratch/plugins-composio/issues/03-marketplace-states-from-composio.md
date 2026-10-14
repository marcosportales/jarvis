# 03: Marketplace shows Plugin states from Composio

**What to build:** The Owner opens `/plugins` and sees Gmail's state read from Composio, not from local storage:
- "No configurado" when `COMPOSIO_API_KEY` is missing
- Conectado when any of Gmail's connected accounts is `ACTIVE`
- Desconectado (Reconectar) when the others are `EXPIRED`, `FAILED` or `INACTIVE`
- Disponible when there are none, or only `INITIATED` ones

If Composio can't be reached, the page shows an error message instead of crashing. This is the tracer bullet:
- The **Composio port** (as defined in ticket 01) is injected into the Plugins module next to its current dependencies, which go away in ticket 07. There is a real adapter over `@composio/core` and a fake for tests. The Owner is one constant Composio user id.
- The Gmail **catalog** entry gains its Composio toolkit slug (`gmail`) and the read-only allowlist of Composio tool slugs from the spec. Adding a Plugin stays one catalog file.

Use the vocabulary from CONTEXT.md. Read the bundled Next docs before touching the page (see AGENTS.md).

**Blocked by:** 01 (Confirm Composio's API against its own docs)

**Status:** ready-for-agent

- [ ] Marketplace states come from Composio account statuses as listed above
- [ ] Missing API key → every Plugin shows "No configurado"
- [ ] Composio unreachable → `/plugins` shows an error message, not a crash
- [ ] Plugins module tests (fake Composio port) cover every status → state mapping and the missing key
- [ ] Lint, typecheck and tests pass
