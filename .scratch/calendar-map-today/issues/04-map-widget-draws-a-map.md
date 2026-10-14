# 04: The Map Widget draws a live map

**What to build:** A new built-in, Expandable Widget, "Mapa", shows a live Google map with the browser key from 02.
- It first appears at left-bottom, Collapsed at about 336×300.
- The Owner can drag and zoom it, Collapsed and Expanded.
- It starts centred on the Owner's location when the browser has permission, otherwise on Jarvis's fallback city, and shows the Owner's location as a dot.
- The view (centre and zoom) is a Widget Setting, written back as the Owner pans and zooms (debounced), and kept across reloads and Sessions.
- The Map settings schema already includes Markers and a Route. This ticket draws them if present, but nothing produces them yet.
- Without the browser key it shows "mapa sin configurar". If Google's script fails to load, it says so instead of showing a blank box.
- Jarvis can Show, Hide, move, Expand and Collapse it with the existing Widget tools.

See `../spec.md` (Map Widget: the map, stories 43–50).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Board test: the Map's view settings are saved and restored; invalid settings fall back to defaults
- [ ] Tool test: the Map is listed as Expandable
- [ ] In the running app:
  - the map draws, pans and zooms in the card and Expanded
  - the location dot appears when permission is granted
  - a reload keeps the view
  - without the key, the "sin configurar" state shows
- [ ] Typecheck, lint and the full test suite pass
