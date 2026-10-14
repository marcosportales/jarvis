# 04: The Browser Widget uses the space when Expanded

**What to build:** When the Browser Widget is Expanded, the remote browser's live screen is shown much larger. What was asked, the current status and the stop button sit beside it, or below it on a narrow window. When the Browse Task ends, the outcome shows up in the Expanded Widget too. Collapsed, the Browser Widget looks the same as today. See `../spec.md`.

**Blocked by:** 01

**Status:** done

- [x] In the running app: during a Browse Task, the Expanded Browser Widget shows the live screen large enough to read, with the request, status and a working stop button
- [x] In the running app: a Browse Task ending while Expanded shows its outcome there
- [x] In the running app: the Collapsed Browser Widget is unchanged, and the Expanded one works on a phone-sized window
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app (headless Chrome) with real Browse Tasks on es.wikipedia.org:

- Expanded at 1440 × 900, the live screen is 928 × 580 (16:10, against 368 × 230 in the card), with what was asked, the status line, "Parar" and "Ver en directo" in a column beside it. Wikipedia's body text is readable.
- A task that ended while Expanded showed "Terminada", its outcome and the final page's link there, with the last screenshot in place of the live view.
- "Parar" stopped a running task while Expanded, and it showed "Parada".
- At 390 × 844 the screen sits on top at full width, with the rest below it.
- The Collapsed card looks as before, apart from the expand button from 01.
- The screen is sized by its box with container units, so it fits the frame's width and height without stretching.
