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

**Status:** done

- [x] "¿Qué tiempo hace en Londres?" answers and Shows the Weather Widget on London
- [x] "¿Y aquí?" switches it back to the Owner's location
- [x] "📍 Mi ubicación" is shown only for another place and switches it back
- [x] The switched place survives a reload
- [x] An unknown place leaves the Widget as it was
- [x] Widget Board tests cover Widget Settings: validation, invalid ones ignored, persisted, Show with settings
- [x] Tool tests cover `show_widget` with valid and invalid settings
- [x] Lint, typecheck and tests pass

## Comments

Checked by hand against `next dev -p 3108` (real model, real Open-Meteo) and headless Chromium. Geolocation is denied headless, so "the Owner's location" was the env fallback city (Madrid).

- "¿Qué tiempo hace en Londres?" with the Widget Hidden: Jarvis answered for "Londres, Reino Unido" and the Widget was Shown on London with "📍 Mi ubicación".
- After a reload it still showed London, and `{"place":"Londres"}` was saved.
- "¿Qué tiempo hace en Zxqwvbn?": one-sentence "No encontré ese lugar", no Widget change; the Widget stayed on London.
- "¿Y aquí?": switched back to the Owner's location; the button disappeared.
- "📍 Mi ubicación" (after asking about Tokio): switched back, the button disappeared, and the Widget didn't move.
- "Muéstrame el tiempo" without a place keeps the place it had (`show` without `settings`).
- "¿Qué tiempo hará mañana en París?" answered with tomorrow's forecast and Shows today's conditions on the Widget for París.
