# 03: The Browser Widget shows the Browse Task live

**What to build:** When a Browse Task starts, the Browser Widget appears and shows it live: the remote browser's screen, what was asked, what it's doing right now and on which site, a stop button and a "Ver en directo" link. When the task ends, the Widget shows the outcome and the final page as a link, gets a short highlight, and is Shown if it was Hidden. Jarvis stays quiet, and there's no sound.
- A new built-in Widget in the catalog, `browser` ("Navegador"), with no settings, Starting Spot left-middle, sized for a 16:10 screen plus a status line. It behaves like any Widget for show, hide, move, drag and toggle. Hiding it never stops the Browse Task.
- A `start_browse` that succeeds in a Turn adds a `show browser` Widget change.
- Polling belongs to the client Session (or a hook beside it), not to the Widget component. It loads the Browse Task view once on page load, polls every few seconds while the task runs whether or not the Widget is Shown, and stops once the task has ended.
- Live view: a sandboxed iframe of the live view URL if ticket 01 confirmed it can be embedded; otherwise the latest step's screenshot, refreshed on each poll. The "Ver en directo" link is there either way.
- The stop button calls the stop route and the view updates.

**Blocked by:** 02

**Status:** done

- [x] A Turn test: a successful `start_browse` → `show browser` change; a failed one → no change
- [x] Client Session tests: polling starts on a running view, stops on an ended one, and an ended view Shows a Hidden Browser Widget
- [x] In the running app: starting a Browse Task shows the Widget live, the stop button stops it, a task that ends while the Widget is Hidden brings it back with the outcome, and a reload mid-task picks it up again
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app (headless Chrome):

- Starting a Browse Task Showed the Browser Widget with the live view streaming in the iframe, what was asked, the status line with the domain, "Parar" and "Ver en directo".
- A fresh page load in the middle of a task picked it up again live, which is the reload case.
- With the Widget Hidden, a task that ended came back Shown with the outcome, the last screenshot, a link to the final page and a ring highlight that faded after 3 s.
- "Parar" stopped a running Renfe task, and the Widget showed "Parada".
- The Browser Widget, like every Widget, starts Shown the first time (the Board's existing rule). At left-middle it overlaps the Results Widget on screens under about 900 px tall.
