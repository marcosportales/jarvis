# 02: The Jarvis App opens Jarvis in its own window (dev mode)

**What to build:** A new `desktop` workspace (Electron, ADR 0009) that opens the Jarvis page in its own window with Jarvis's name and icon, on the `next dev` server. All of Jarvis stays in `apps/web`.

The App controller holds the Jarvis App's decisions, behind ports (Server, Windows, Shortcuts, Tray, Shell, Dialogs) so it's tested without Electron. In this ticket the Server port only waits for the dev server; 03 makes it start a real one.

- The window shows once Jarvis answers. Closing it hides it, and Jarvis keeps running.
- A second launch shows and focuses the running window instead of starting another app.
- `jarvis --quit` (sent to the running instance) and a tray "Salir" quit Jarvis. The tray ("Mostrar Jarvis", "Salir") appears only when the desktop has one.
- Navigation or new windows to any origin other than Jarvis's own open in the Owner's browser and are cancelled in the app.

The Electron adapter:

- allows a single instance
- grants the microphone only to Jarvis's own origin
- turns off background throttling, so recording and Speaking work while the window is hidden
- remembers the window's size and place

A separate dev command runs `next dev` and the Jarvis App together. The default `pnpm dev` keeps starting only the web app.

See `../spec.md` (stories 1, 4–9, 11–18, 49, 50, 52, 53; "Shape", "The App controller").

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Read the installed Turborepo docs before adding the desktop tasks (AGENTS.md)
- [x] App controller tests, with fake ports:
  - the window is shown only after the server is ready
  - a second launch shows and focuses the window
  - closing hides, it doesn't quit
  - quit stops the server, then exits
  - an outside URL goes to the Shell and is cancelled; Jarvis's own URLs aren't
  - no tray → still fully usable
- [x] `pnpm dev` alone opens no Electron window
- [ ] In the running app:
  - holding Space in the window makes a Turn, with no microphone prompt after the first run
  - closing the window mid-Reply keeps it Speaking
  - relaunching brings the window back
  - a link in the Results Widget opens in the browser
  - `jarvis --quit` exits
- [x] Typecheck, lint and the full test suite pass
