# 03: The Browser Widget shows the Browse Task live

**What to build:** When a Browse Task starts, the Browser Widget appears and shows it live: the remote browser's screen, what was asked, what it's doing right now and on which site, a stop button and a "Ver en directo" link. When the task ends, the Widget shows the outcome and the final page as a link, gets a short highlight, and is Shown if it was Hidden. Jarvis stays quiet, and there's no sound.
- A new built-in Widget in the catalog, `browser` ("Navegador"), with no settings, Starting Spot left-middle, sized for a 16:10 screen plus a status line. It behaves like any Widget for show, hide, move, drag and toggle. Hiding it never stops the Browse Task.
- A `start_browse` that succeeds in a Turn adds a `show browser` Widget change.
- Polling belongs to the client Session (or a hook beside it), not to the Widget component. It loads the Browse Task view once on page load, polls every few seconds while the task runs whether or not the Widget is Shown, and stops once the task has ended.
- Live view: a sandboxed iframe of the live view URL if ticket 01 confirmed it can be embedded; otherwise the latest step's screenshot, refreshed on each poll. The "Ver en directo" link is there either way.
- The stop button calls the stop route and the view updates.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A Turn test: a successful `start_browse` → `show browser` change; a failed one → no change
- [ ] Client Session tests: polling starts on a running view, stops on an ended one, and an ended view Shows a Hidden Browser Widget
- [ ] In the running app: starting a Browse Task shows the Widget live, the stop button stops it, a task that ends while the Widget is Hidden brings it back with the outcome, and a reload mid-task picks it up again
- [ ] Typecheck, lint and the full test suite pass
