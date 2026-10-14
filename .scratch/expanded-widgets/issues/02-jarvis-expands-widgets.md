# 02: Jarvis expands and collapses Widgets when asked

**What to build:** The Owner can say "amplía el navegador" to expand a Widget, and Hidden Widgets get Shown as well. Saying "ciérralo" or "hazlo pequeño" while a Widget is Expanded collapses it, without hiding it. Asking to expand the Weather Widget gets a spoken answer that it can't be expanded. Jarvis never expands anything unless the Owner asks. See `../spec.md`.
- Widget changes gain `expand` (with an id) and `collapse` (without one). The Board applies them in order with the others.
- The layout sent with each Turn gains `expanded`.
- New tools:
  - `expand_widget(id)`: its description lists only Expandable Widgets. For an unknown or non-Expandable id it answers the model in Spanish and records nothing.
  - `collapse_widget()`
- Tool descriptions and the system prompt say:
  - Jarvis only expands when asked
  - "cerrar" while a Widget is Expanded means collapse
  - moving the Expanded Widget collapses it at its new Spot (the Board rule from 01)
- The layout notice marks the Expanded Widget as "ampliado".

**Blocked by:** 01

**Status:** done

- [x] Tool tests: `expand_widget` records an expand change for Results and Browser, answers in Spanish and records nothing for Weather and unknown ids, and `collapse_widget` records a collapse change
- [x] Tool test: the layout notice says "ampliado" for the Expanded Widget only
- [x] Board test: `applyChanges` handles `expand` and `collapse` in order with other changes
- [x] In the running app, by voice:
  - "amplía los resultados" expands Results
  - "ciérralo" collapses it and leaves it Shown
  - "amplía el tiempo" gets a spoken refusal
  - expanding a Hidden Browser Widget Shows it Expanded
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app by voice (headless Chrome, with each phrase made by Jarvis's own speech route and fed in as the microphone):

- "Amplía los resultados." → Results Expanded; "Listo, ya tienes los resultados en grande."
- "Ciérralo." → Results Collapsed and still Shown; "Hecho, vuelve a su sitio."
- "Amplía el tiempo." → nothing changed; "El del tiempo no se puede ampliar, solo los resultados y el navegador."
- With the Browser Widget Hidden, "Amplía el navegador." → Browser Shown and Expanded.
- The `applyChanges` test for `expand` and `collapse` landed with 01, along with the Board side of the changes.
