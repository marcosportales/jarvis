# 02: The Weather Widget appears top-right and can be closed

**What to build:** On a fresh browser the Owner opens the Jarvis page and sees the Weather Widget floating in the top-right margin, showing the weather for their location. They can close it with its ✕, and it stays closed after a reload. This is the tracer bullet that stands up the Widget groundwork every later ticket builds on:

- The **Widget registry**: the only place a Widget is declared. Each entry has an id, a Spanish name, a model-facing one-line description, an optional Starting Spot, a source marker (built-in only for now) and its component. Weather is the only entry, with Starting Spot right-top.
- The **Widget Board** (client, framework-free), the main test seam for Widgets. It's created with the registry, a storage adapter, the viewport size and a random source. In this ticket it supports: first placement at the Starting Spot, Show, Hide, subscribe/snapshot, and saving to and loading from localStorage under one versioned key. Missing, corrupt or wrong-version state falls back to defaults. Registry additions and removals are handled. One Board per tab.
- A **Widget layer** on the Jarvis page only, rendering each Shown Widget as a compact card with an always-visible ✕ that Hides it.
- The **Weather Widget**: place name, current °C, condition icon and text, today's high/low and wind, all from the weather endpoint (ticket 01). It asks for geolocation when it first renders Shown in a Session, and falls back to the env city if permission is denied. It shows a skeleton while loading and "No pude cargar el tiempo" on failure, and refreshes every 15 minutes.

Use the vocabulary from CONTEXT.md (Widget, Shown, Hidden, Starting Spot). Read the bundled Next docs before writing client components (see AGENTS.md). See the spec's "Widget registry", "Widget Board" and "UI" sections.

**Blocked by:** 01

**Status:** done

- [x] Fresh browser: the Weather Widget is Shown in the top-right margin of the Jarvis page, not over the orb or the Transcript
- [x] It shows real weather for the Owner's location, or for the env city when location is denied
- [x] The ✕ Hides it, and it stays Hidden after a reload
- [x] Widgets do not appear on the Plugins page
- [x] Widget Board tests (in-memory storage, fixed viewport) cover: Starting Spot on first run, Show/Hide, save after each change, load on start, corrupt and old state falling back to defaults, registry additions and removals
- [x] Lint, typecheck and tests pass
