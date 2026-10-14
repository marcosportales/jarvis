# 08: Google Calendar in the Marketplace

**What to build:** Google Calendar becomes a Plugin the Owner can Install, Reconnect and Uninstall from the Marketplace through Composio, exactly like Gmail.
- The Plugin is read-only. Its allowlist is events list/get, find event, list calendars and free/busy.
- Its catalog entry is marked so that its tools are **not** offered to the model over MCP. Jarvis reads the calendar through its own `read_agenda` later (ticket 10).
- The Plugins module gains `connectedPluginIds()`, and `toolsForTurn()` also reports the Connected Plugin ids.
- The Composio port gains `execute(slug, args)` for the Owner's connected account.
- Confirm the slugs and arguments that list the Owner's selected calendars and their events (recurring events expanded, the Owner's time zone). Record trimmed fixtures:
  - an ordinary day
  - an all-day event
  - a recurring event
  - several calendars with colours
  - an empty day
  - a failure

  Recording real fixtures needs the Owner to complete the consent screen once in the running app; ask them when you get there.

See `../spec.md` (stories 12–15).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Plugins tests: Google Calendar shows in the Marketplace states; `connectedPluginIds()` lists it when its account is active; its tools are never in `toolsForTurn()`
- [ ] Findings under `## Comments` (slugs, arguments, pinned toolkit version) and recorded fixtures
- [ ] In the running app: Install through consent, Reconnect, and Uninstall work for Google Calendar
- [ ] Typecheck, lint and the full test suite pass
