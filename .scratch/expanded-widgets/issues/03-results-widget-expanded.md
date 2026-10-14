# 03: The Results Widget uses the space when Expanded

**What to build:** When the Results Widget is Expanded, the Search's cards are laid out as a multi-column grid that shows more of each result's key details, so the Owner can compare options at a glance. Links open exactly as they do in the card. Collapsed, the Results Widget looks the same as today. See `../spec.md`.

**Blocked by:** 01

**Status:** done

- [x] In the running app: after a list Search, the Expanded Results Widget shows a grid that uses the width, with more detail per result than the card
- [x] In the running app: links in the Expanded Results Widget open the result
- [x] In the running app: the Collapsed Results Widget is unchanged, and the Expanded one stays readable on a phone-sized window
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app (headless Chrome) with a real list Search ("Busca hoteles en Roma para el próximo fin de semana", 10 hotels):

- Expanded at 1440 × 900, the Results form a 4-column grid, each card with its whole subtitle, its facts at a readable size, and its source or the link's domain.
- Clicking a result's title opened it in a new tab, and the Widget stayed Expanded.
- At 390 × 844 the grid falls back to one column, full screen.
- The Collapsed card looks as before, apart from the expand button from 01.
