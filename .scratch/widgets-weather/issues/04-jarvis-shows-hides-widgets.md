# 04: Jarvis Shows and Hides Widgets

**What to build:** The Owner says or types "oculta el tiempo" or "muéstrame el tiempo", and Jarvis Hides or Shows the Weather Widget and confirms in one short sentence. This ticket wires Jarvis to the Widget Board end to end, per ADR 0002:

- **Reply contract:** the Brain now returns the Reply text plus a list of Widget changes (show `{ id }`, hide `{ id }`). The request to the Reply endpoint now also carries the Widget layout description from the Board (for each Widget: id, name, Shown).
- **Jarvis's Widget tools for a Turn** (server), a new test seam: `show_widget(id)` and `hide_widget(id)`, generated from the registry so the allowed ids and each Widget's description are in the tool descriptions. They're given every Turn alongside the Plugin tools. Each call records a Widget change and returns a short confirmation. An unknown id returns a model-facing error and records no change.
- The current layout and new Spanish rules go into the system prompt: confirm Widget actions in one sentence, and say plainly when a Widget doesn't exist.
- **Session:** gets a narrow "apply Widget changes" adapter and applies the changes as soon as the Reply arrives, before Speaking. A failed Turn applies nothing.

**Blocked by:** 02

**Status:** done

- [x] "Oculta el tiempo" (spoken or typed) Hides the Weather Widget, and Jarvis confirms in one sentence
- [x] "Muéstrame el tiempo" Shows it again
- [x] "Ya lo tienes" style answers: Jarvis knows whether the Widget is already Shown
- [x] Asking for a Widget that doesn't exist gets a one-sentence "no tengo ese widget" style Reply and no change
- [x] Tool tests: each Widget tool records the right change; an unknown id gives an error and no change; tool descriptions list the registry's Widgets
- [x] Session tests (extending the existing ones): Widget changes from the Brain are applied before Speaking, and not applied when the Turn fails
- [x] Lint, typecheck and tests pass

## Comments

- Checked typed Turns end to end in headless Chrome against the real model: "Oculta el tiempo" Hid the Widget (and it was saved), "Muéstrame el tiempo" Showed it again. The spoken path wasn't exercised (no microphone headless); it goes through the same Reply code. "Ya lo tienes" and the unknown-Widget Reply were checked by posting to `/api/reply`.
