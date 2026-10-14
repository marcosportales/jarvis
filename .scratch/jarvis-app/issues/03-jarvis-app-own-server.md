# 03: The Jarvis App runs its own server: no terminal, starts at login

**What to build:** The packaged Jarvis App starts Jarvis's server itself, so the Owner never opens a terminal, and it can start hidden at login.

The server:
- The web app builds with Next's standalone output, traced from the monorepo root, and runs in an Electron utility process on Electron's own Node.
- `better-sqlite3` loads in Electron as it is (its prebuilt binary is a Node-API addon, so no rebuild), and the migrations folder ships with the app.
- The server runs from the standalone app folder, because migrations are found relative to it.
- It listens on `127.0.0.1` only, at `JARVIS_PORT` or 3737.
- Keys come from `~/.config/Jarvis/jarvis.env`.
- The database is `~/.config/Jarvis/jarvis.db`, apart from the development one, and migrations run on start.
- Server output goes to a log file there.

Start-up and failure:
- The window is shown only once the server answers.
- If the server exits, or doesn't answer in time (port taken, bad key file…), an error dialog gives the reason and the log path, then the app quits.

Packaging:
- electron-builder, a Linux AppImage plus a `.desktop` entry.
- `--hidden` starts without showing the window.
- The README gives the `exec-once = jarvis --hidden` line, how to create `jarvis.env`, and the package command.

See `../spec.md` (stories 2, 3, 10, 37–43, 51; "Shape").

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [x] Read Next 16's docs in `node_modules/next/dist/docs/` on standalone output and monorepo tracing before changing the build
- [x] Config tests:
  - port default 3737 and the `JARVIS_PORT` override
  - database path under the config directory
  - `jarvis.env` parsing (comments, quotes, blank lines)
  - host always `127.0.0.1`
- [x] App controller tests:
  - `--hidden` doesn't show the window
  - the server exiting or never becoming ready → error dialog with the log path, then quit
- [x] One command builds the web app and packages the AppImage
- [ ] In the packaged app:
  - starts from the launcher with no terminal
  - a fresh `jarvis.db` is created and migrated
  - an existing Session survives restarting the app
  - `exec-once = jarvis --hidden` starts it hidden at login
  - `127.0.0.1:3737` in the browser shows the same Session
  - the port isn't reachable from another device
  - the System Widget's numbers move
  - connecting a Plugin from the app's Marketplace opens the browser and ends Connected in the app's window
- [x] Typecheck, lint and the full test suite pass
