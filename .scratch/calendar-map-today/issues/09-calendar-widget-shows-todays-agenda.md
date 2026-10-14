# 09: The Calendar Widget shows today's Agenda while Connected

**What to build:** Once Google Calendar is Connected, a new Widget, "Calendario", appears at right-bottom (about 300×320). It shows today's date and today's Agenda Items in time order.
- **Each Agenda Item** shows its time (24-hour, or "todo el día"), its title, and a colour for its calendar.
- **Item states:**
  - Ended items are faded and the current one stands out.
  - Clicking an item shows its place, description and calendar.
- **Widget states:**
  - "Nada para hoy" when the day is empty, and a clear failure message when the Agenda can't load.
  - It refreshes every 5 minutes while Shown.
- **Without the Plugin:** while Google Calendar isn't Connected, the Calendar Widget doesn't exist. It's not rendered, not in the sidebar toggles, not in the layout sent to Jarvis, and not in Jarvis's Widget tools.
- **Coming back:** its saved place is kept, so it comes back where it was when the Plugin is Connected again.
- **Plugin Widgets (ADR 0007):**
  - `WidgetSource` gains `"plugin"`, and a Plugin Widget's catalog entry names its Plugin.
  - The Board learns which Widgets are available. The page gets the Connected Plugin ids from the server when it renders.
- **Agenda module:**
  - `agendaFor(from, to)` returns Agenda Items or a failure. Each item is an `event` from `google-calendar`, shaped so other sources can join later.
  - A mapper over the 08 fixtures.
  - A server route the Widget fetches from.
- The Calendar settings schema has `day` and `view`. This ticket only shows `day` (defaulting to today) Collapsed.

See `../spec.md` (stories 16–29, 78).

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Mapper tests over the 08 fixtures: time order, all-day, recurring, calendar colours, time zone, empty day
- [ ] Board tests:
  - an unavailable Plugin Widget isn't in the snapshot or `describeLayout()`, and ignores show, move and expand
  - its saved position comes back once available
- [ ] Tool test: unavailable Widgets are left out of Jarvis's Widget tool descriptions
- [ ] Test of the server route's handler over a fake Agenda: Agenda Items for a day, and the failure case
- [ ] In the running app:
  - no Calendar Widget before connecting, and it appears after
  - it shows today's Agenda Items with colours
  - the empty and failure states work
  - it disappears after Uninstall and comes back in place after reinstalling
- [ ] Typecheck, lint and the full test suite pass
