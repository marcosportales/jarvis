# 01: The Today Widget shows the date and time

**What to build:** A new built-in Widget, "Hoy", shows today's weekday and date in Spanish ("martes, 14 de octubre de 2026") and the time as `HH:mm` in 24-hour form, in the Owner's own time zone.
- The time changes exactly on the minute, and the date rolls over at midnight.
- It behaves like the Weather Widget: the Owner and Jarvis can Show, Hide and move it. It isn't Expandable and has no Widget Settings.
- It takes the right-top Starting Spot. The Weather Widget's Starting Spot moves to right-middle, so an Owner who never placed Weather sees it just below. A saved Weather position still wins.

See `../spec.md` (Today Widget, stories 1–11).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Unit tests for the pure formatting function: fixed dates and time zones, Spanish weekday and month, single-digit hours (`07:05`), midnight (`00:00`), and a date in another time zone
- [ ] Board tests: with empty storage, Today starts at right-top and Weather at right-middle; a saved Weather position is kept
- [ ] Tool test: the Today Widget appears in Jarvis's Widget tools and isn't in the Expandable list
- [ ] In the running app:
  - the Today Widget sits above Weather on a fresh profile
  - the time turns over on the minute
  - "quita la hora" Hides it, and "pon la fecha abajo a la izquierda" moves it
- [ ] Typecheck, lint and the full test suite pass
