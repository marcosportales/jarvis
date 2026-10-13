# 08: The Weather Widget follows the place Jarvis asked about

**What to build:** After "¿y en Londres?" the Weather Widget switches to London. Asking about the Owner's own place again switches it back, and so does a "📍 Mi ubicación" button that appears on the Widget only while it shows another place. The place is remembered across reloads. Forecast questions still show today's conditions on the Widget. A place Jarvis can't find leaves the Widget unchanged.

This introduces **Widget Settings** generically, so future Widgets get them for free:

- A registry entry may declare a Widget Settings schema (zod) with defaults. Weather's is `{ place?: string }`, where absent means the Owner's location.
- The Widget Board stores Widget Settings per Widget, validates them against the schema (ignoring invalid ones), and persists them. Show accepts optional Widget Settings.
- `show_widget(id, settings?)` takes each Widget's schema as input, described in the tool. Invalid settings give a model-facing error and no change. The Widget layout sent to Jarvis includes Widget Settings.
- A Spanish system-prompt rule: to point the Weather Widget back at the Owner, Show it with no place.
- The Weather Widget reads its place from its Widget Settings and refetches when it changes.

Use the vocabulary from CONTEXT.md (Widget Setting).

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] "¿Qué tiempo hace en Londres?" answers and Shows the Weather Widget on London
- [ ] "¿Y aquí?" switches it back to the Owner's location
- [ ] "📍 Mi ubicación" is shown only for another place and switches it back
- [ ] The switched place survives a reload
- [ ] An unknown place leaves the Widget as it was
- [ ] Widget Board tests cover Widget Settings: validation, invalid ones ignored, persisted, Show with settings
- [ ] Tool tests cover `show_widget` with valid and invalid settings
- [ ] Lint, typecheck and tests pass
