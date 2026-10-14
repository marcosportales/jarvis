# 01: The Today Widget shows the date and time

**What to build:** A new built-in Widget, "Hoy", shows today's weekday and date in Spanish ("martes, 14 de octubre de 2026") and the time as `HH:mm` in 24-hour form, in the Owner's own time zone.
- The time changes exactly on the minute, and the date rolls over at midnight.
- It behaves like the Weather Widget: the Owner and Jarvis can Show, Hide and move it. It isn't Expandable and has no Widget Settings.
- It takes the right-top Starting Spot. The Weather Widget's Starting Spot moves to right-middle, so an Owner who never placed Weather sees it just below. A saved Weather position still wins.

See `../spec.md` (Today Widget, stories 1–11).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Unit tests for the pure formatting function: fixed dates and time zones, Spanish weekday and month, single-digit hours (`07:05`), midnight (`00:00`), and a date in another time zone
- [x] Board tests: with empty storage, Today starts at right-top and Weather at right-middle; a saved Weather position is kept
- [x] Tool test: the Today Widget appears in Jarvis's Widget tools and isn't in the Expandable list
- [x] In the running app:
  - the Today Widget sits above Weather on a fresh profile
  - the time turns over on the minute
  - "quita la hora" Hides it, and "pon la fecha abajo a la izquierda" moves it
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app (headless Chrome, 1600 × 1000):

- On a fresh profile, "Hoy" sits at right-top ("13:50" and "miércoles, 14 de octubre de 2026"), with Weather below it at right-middle.
- The time went from 13:50 to 13:51 on the minute.
- "quita la hora" Hid it ("Hecho, ya no ves la hora."), and "pon la fecha abajo a la izquierda" Showed it at left-bottom.
- Every profile that loaded the page before this already had Weather saved at right-top, because the first load saves every Widget's place. So a new Widget's Starting Spot now stacks clear of the Shown Widgets already there, the same way a move does. On such a profile, Weather stays at right-top and Today starts just below it. The Owner chose this over moving an unmoved Weather. Covered by a Board test with a layout saved under the old catalog.
