# 01: The System Widget shows CPU and RAM, below the Weather Widget

**What to build:** A new built-in Widget, "Sistema", shows how busy the computer Jarvis runs on is right now: whole-machine CPU % and RAM used out of the total (e.g. "11,2 de 16 GB"), each with a small bar. The numbers refresh about every 2 s, only while it is Shown.
- It first appears directly below the Weather Widget, wherever Weather is. If Weather is Hidden or there's no room below it, it falls back to right-middle, clear of the others. A saved place wins, and no other Widget moves when it arrives.
- It behaves like the Today and Weather Widgets: the Owner and Jarvis can Show, Hide and move it, and it has a sidebar toggle. It isn't Expandable and has no Widget Settings.
- This ticket builds the Machine module (CPU and RAM only; battery comes in 02), the system route and the Widget. The Health button is a placeholder until 03.

See `../spec.md` (stories 1, 2, 5–17; "Widget catalog and Board", "Machine readings", "Server route and the Widget").

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Machine parser tests over recorded fixtures: CPU % from two counter samples; RAM used is total minus available, not free
- [x] The first reading returns a real CPU %, never a blank
- [x] Board tests, with fake storage:
  - empty storage → System directly below Weather
  - Weather saved under Today at right-top → System directly below it there
  - Weather Hidden, or no room below it → right-middle, clear of others
  - a saved System position wins
  - no other Widget moves when System is added to a saved layout
- [x] Tool test: `system` appears in Jarvis's Widget tools and isn't in the Expandable list
- [x] The route answers the reading; a failing read answers `machine: null` and doesn't fail the route
- [x] The Widget polls only while Shown; numbers use `es-ES` formatting
- [x] In the running app:
  - it sits under Weather on a fresh profile and on the Owner's existing one
  - the numbers move
  - "quita el sistema" Hides it, and "pon el sistema abajo a la izquierda" moves it
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app (headless Chrome, 1600 × 1000):

- On a fresh profile, "Sistema" sits directly below Weather at right-middle (Weather at top 416, System at 592: Weather's 168px slot plus the 8px gap).
- On a profile saved before System, with Weather under Today at right-top, System starts below Weather there (top 368), and no other Widget moved.
- The numbers moved between readings ("43 %" then "79 %"; "7,1 de 15,3 GB" then "7,2 de 15,3 GB").
- "quita el sistema" Hid it ("Listo, ya no ves el sistema."), and "pon el sistema abajo a la izquierda" moved it ("Hecho, el sistema ya está abajo a la izquierda.").
- `GET /api/system` answers the reading; a failing read is logged and answers `machine: null`.

Notes:

- The System Widget keeps the usual width but is taller (232px), so the Board's entry has a `height` rather than a `size`: a `size` would also give the card a fixed height and make it scroll.
- Starting below Weather also falls back to right-middle when the place below Weather is taken by another Widget, not only when it's off screen.
- On a left side already full (Results and Browser Shown), "abajo a la izquierda" stacks upwards until there is no room and ends up at the top, behind Results. That's the Board's existing stacking for any Widget at a full Spot, not new here.
