# 01: The System Widget shows CPU and RAM, below the Weather Widget

**What to build:** A new built-in Widget, "Sistema", shows how busy the computer Jarvis runs on is right now: whole-machine CPU % and RAM used out of the total (e.g. "11,2 de 16 GB"), each with a small bar. The numbers refresh about every 2 s, only while it is Shown.
- It first appears directly below the Weather Widget, wherever Weather is. If Weather is Hidden or there's no room below it, it falls back to right-middle, clear of the others. A saved place wins, and no other Widget moves when it arrives.
- It behaves like the Today and Weather Widgets: the Owner and Jarvis can Show, Hide and move it, and it has a sidebar toggle. It isn't Expandable and has no Widget Settings.
- This ticket builds the Machine module (CPU and RAM only; battery comes in 02), the system route and the Widget. The Health button is a placeholder until 03.

See `../spec.md` (stories 1, 2, 5–17; "Widget catalog and Board", "Machine readings", "Server route and the Widget").

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Machine parser tests over recorded fixtures: CPU % from two counter samples; RAM used is total minus available, not free
- [ ] The first reading returns a real CPU %, never a blank
- [ ] Board tests, with fake storage:
  - empty storage → System directly below Weather
  - Weather saved under Today at right-top → System directly below it there
  - Weather Hidden, or no room below it → right-middle, clear of others
  - a saved System position wins
  - no other Widget moves when System is added to a saved layout
- [ ] Tool test: `system` appears in Jarvis's Widget tools and isn't in the Expandable list
- [ ] The route answers the reading; a failing read answers `machine: null` and doesn't fail the route
- [ ] The Widget polls only while Shown; numbers use `es-ES` formatting
- [ ] In the running app:
  - it sits under Weather on a fresh profile and on the Owner's existing one
  - the numbers move
  - "quita el sistema" Hides it, and "pon el sistema abajo a la izquierda" moves it
- [ ] Typecheck, lint and the full test suite pass
