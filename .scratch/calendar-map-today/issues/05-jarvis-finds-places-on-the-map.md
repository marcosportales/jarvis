# 05: Jarvis finds places on the Map

**What to build:** The Owner says "busca cafeterías cerca" or "¿dónde está el Museo del Prado?". Jarvis puts the places on the Map as numbered Markers, Shows the Map Widget on its own, fits them in view, and sums up out loud what it found. Finding places moves from Search to the Map.
- **Maps module:**
  - A port over Composio's `google_maps` toolkit, using the slugs, versions and fixtures from 03.
  - Mappers to the spec's Place shape.
  - Jarvis's built-in tools `find_places(query, near?)`, `center_map(place | marker, zoom?)` and `clear_map()`.
- **Tool behaviour:**
  - The tools start from the Map settings in the layout and compose within a Turn.
  - A new search replaces the Markers.
  - "Cerca" uses the Turn's coordinates. Without them, the tool answers the model to ask "¿cerca de dónde?".
  - A Maps failure answers the model in Spanish and never fails the Turn.
- **Widget changes and Turn rule:**
  - Widget changes gain `settings`, which replaces a Widget's settings without Showing it, applied in order on the Board.
  - When the map tools changed the map, the Reply carries a `settings` change for the Map. It also carries a `show` unless the model already did something with the Map Widget. Never `expand`.
- **Layout notice:** it lists the numbered Markers (name, address) and the Route, never raw settings or polylines.
- **Search:**
  - Remove `search_places`, the `COMPOSIO_SEARCH_GOOGLE_MAPS` slug and the `places` Search kind.
  - Update the system prompt: places and ways to get somewhere go to the Map.
- "Quita los marcadores" or "limpia el mapa" clears the Markers and the Route. "Centra el mapa en Sevilla" or "acércate" moves the view.

See `../spec.md` (stories 51–56, 60–61, 73–77).

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [ ] Mapper tests over the 03 fixtures: Places from text and nearby search, and geocoding
- [ ] Turn tests with a fake Maps port:
  - `find_places` gives a Map `settings` change with numbered Markers plus a `show`, and no `expand`
  - the model hiding the Map keeps the `settings` change and drops the `show`
  - several map tools in one Turn compose
  - no coordinates for "cerca" means the tool asks
  - a failing port still gives a Reply
  - `search_places` is gone
- [ ] Board test: a `settings` change replaces settings without Showing, in order with other changes
- [ ] Tool test: the layout notice lists Markers and the Route without polylines
- [ ] In the running app, by voice:
  - "busca cafeterías cerca" puts numbered Markers on the Map and Shows it
  - "¿cuál tiene mejor nota?" is answered from the Markers
  - "limpia el mapa" clears them
  - "centra el mapa en Sevilla" moves it
- [ ] Typecheck, lint and the full test suite pass
