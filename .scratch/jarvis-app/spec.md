# Spec: Jarvis App — Jarvis as its own app on the Owner's computer

Status: ready-for-agent

## Problem Statement

The Owner reaches Jarvis only as a browser tab, and only after starting its server by hand in a terminal (`pnpm dev`). Jarvis is lost among the browser's other tabs. It isn't there after the computer starts. It stops existing when the terminal closes. Push-to-talk only works while the Jarvis tab has focus: to ask Jarvis something while writing code or reading a page in another app, the Owner first has to find the tab, then hold Space. Nothing on screen shows what Jarvis is doing (Listening, Thinking, Speaking) once the Owner has switched to another app.

## Solution

The **Jarvis App**: Jarvis running as its own app on the Owner's computer (ADR 0009). It is a thin Electron shell, a new `desktop` workspace beside `web`. It runs the same Jarvis, with the same Sessions, Memories, Widgets and Plugins, so `apps/web` stays the one place every feature lives.

- **No terminal.** The Jarvis App starts Jarvis's server inside itself and opens its own window on it, with its own icon and name.
- **Starts with the computer.** One `exec-once` line in `hyprland.conf` starts it at login, hidden.
- **Keeps running.** Closing the window hides it; Jarvis keeps running, and a Browse Task or a Reply being Spoken carries on. Launching the app again, the Floating Orb or the tray (if the Owner has one) brings the window back. Quitting is explicit.
- **Push-to-talk from any app.** Holding `SUPER + J` while any other app is focused works exactly like holding Space on the Jarvis page: hold to capture an Utterance, release to send it. This goes through the desktop portal's Global Shortcuts, bound in `hyprland.conf`.
- **The Floating Orb.** A small window with only the Orb, kept above every other app by a Hyprland window rule. It shows the Jarvis State. Holding it is Push-to-talk, and clicking it brings back the Jarvis window.
- **Its own data.** Keys live in `~/.config/Jarvis/jarvis.env` and the database in `~/.config/Jarvis/jarvis.db`, kept apart from the development database. Jarvis listens on `127.0.0.1:3737` (overridable with `JARVIS_PORT`), so a browser tab on the same computer reaches the same Jarvis.
- **Plugins still connect.** Google refuses sign-in inside an app window, so connecting a Plugin opens the Owner's own browser and finishes there. The Marketplace in the Jarvis App then shows the Plugin as Connected.

Only the Owner's Arch Linux machine (Hyprland, Wayland) is supported for now. Nothing machine-specific is baked in, so other systems can come later.

## User Stories

### Starting and stopping

1. As the Owner, I want to open Jarvis from my app launcher like any other app, so that I never open a terminal or run `pnpm dev` to talk to it.
2. As the Owner, I want the Jarvis App to start Jarvis's server on its own and show the window only once Jarvis is ready, so that I never see a blank page or a connection error.
3. As the Owner, I want the Jarvis App to start hidden when my Hyprland session starts, so that Jarvis is always there without a window in my way.
4. As the Owner, I want launching the Jarvis App a second time to bring up the running one instead of starting another, so that there is only ever one Jarvis and one server.
5. As the Owner, I want closing the Jarvis window to hide it while Jarvis keeps running, so that Push-to-talk from any app and the Floating Orb keep working.
6. As the Owner, I want a Reply that is being Spoken to keep playing when I close the window, so that hiding Jarvis doesn't cut it off.
7. As the Owner, I want a Browse Task to carry on while the window is hidden, so that I can come back to its outcome later.
8. As the Owner, I want a clear way to quit Jarvis entirely (a "Salir de Jarvis" command, and in the tray menu when there is a tray), so that I can stop it and its server when I want to.
9. As the Owner, I want quitting to stop Jarvis's server too, so that nothing is left running behind my back.
10. As the Owner, I want a message telling me what's wrong if Jarvis's server can't start (e.g. the port is taken or a key is missing), with where to find the log, so that I'm not left with a window that never appears.
11. As the Owner, I want the Jarvis App to show a tray icon with "Mostrar Jarvis" and "Salir" when my desktop has a tray, so that I can use it if I ever add a bar.
12. As the Owner, I want the Jarvis App to work fully without a tray, so that it's usable on my Hyprland setup today.

### The Jarvis window

13. As the Owner, I want the Jarvis App's window to be its own window with Jarvis's name and icon, so that I find it apart from my browser tabs.
14. As the Owner, I want the Jarvis page inside the window to be exactly the one I know (Orb, Transcript, Widgets, Sessions, Marketplace), so that nothing has to be relearned.
15. As the Owner, I want holding Space in the Jarvis window to keep working as Push-to-talk, so that my habit still works.
16. As the Owner, I want the Jarvis App to remember the window's size and place, so that it opens where I left it.
17. As the Owner, I want links in Replies and in the Results Widget to open in my own browser, so that the Jarvis window never turns into a web browser.
18. As the Owner, I want the microphone to work in the Jarvis App without a permission prompt every time, so that Push-to-talk works right after starting it.

### Push-to-talk from any app

19. As the Owner, I want to hold `SUPER + J` while any other app is focused to start Push-to-talk, so that I can speak to Jarvis without switching to it.
20. As the Owner, I want releasing `SUPER + J` to send the Utterance, exactly like releasing Space, so that Push-to-talk means the same everywhere.
21. As the Owner, I want Push-to-talk from any app to work while the Jarvis window is hidden, so that Jarvis can stay out of my way.
22. As the Owner, I want starting Push-to-talk from any app to cut short a Reply being Spoken, as it does on the page, so that I can interrupt Jarvis from anywhere.
23. As the Owner, I want too short a hold from any app to be discarded with the same hint as on the page, so that a stray key press doesn't send noise.
24. As the Owner, I want the Jarvis window to stay where it is (hidden or behind other apps) when I use Push-to-talk from any app, so that my focus isn't stolen.
25. As the Owner, I want the Reply to a Turn started from any app to be Spoken aloud and added to the Transcript of the current Session, so that I can read it later in the window.
26. As the Owner, I want Widgets that Jarvis Shows during such a Turn to be there when I open the window, so that nothing it did is lost.
27. As the Owner, I want a hold started with `SUPER + J` not to be cut short just because the Jarvis window loses or doesn't have focus, so that holding from another app actually works.
28. As the Owner, I want the README to give me the exact `hyprland.conf` lines for the key, the Floating Orb and starting at login, so that setting it up is a copy-paste.

### The Floating Orb

29. As the Owner, I want a small Floating Orb that stays above every other app, so that I always see what Jarvis is doing.
30. As the Owner, I want the Floating Orb to show the Jarvis State (Idle, Listening, Thinking, Speaking) the same way the Orb on the page does, so that I know whether Jarvis heard me, is working or is talking.
31. As the Owner, I want to hold the Floating Orb with the mouse for Push-to-talk, so that I can talk to Jarvis without a key.
32. As the Owner, I want clicking the Floating Orb (without holding it) to bring up the Jarvis window, so that the Transcript and Widgets are one click away.
33. As the Owner, I want the Floating Orb to hold nothing but the Orb, so that it stays small and never covers my work.
34. As the Owner, I want the Floating Orb's window to have a fixed window class and title, so that one Hyprland window rule floats and pins it where I want.
35. As the Owner, I want the Floating Orb not to take focus when shown or clicked, so that typing in my current app isn't interrupted.
36. As the Owner, I want the Floating Orb to stay in step with the Jarvis window, so that both always show the same Jarvis State.

### Data, keys and the browser

37. As the Owner, I want the Jarvis App to read its keys from `~/.config/Jarvis/jarvis.env`, so that the app works without a checkout of the repo.
38. As the Owner, I want the Jarvis App's Sessions and Memories in `~/.config/Jarvis/jarvis.db`, apart from the development database, so that a dev migration or test can never wipe my real Memories.
39. As the Owner, I want the Jarvis App to apply database migrations on start, as `pnpm dev` does, so that updating the app keeps my data working.
40. As the Owner, I want Jarvis to listen only on `127.0.0.1`, never on my network, so that nobody else on the network can reach my Jarvis.
41. As the Owner, I want Jarvis on a fixed port (`3737`, changeable with `JARVIS_PORT`), so that a browser tab can reach it and doesn't clash with `pnpm dev` on 3000.
42. As the Owner, I want opening `http://127.0.0.1:3737` in my browser while the Jarvis App runs to show the same Jarvis, with the same Sessions and Memories, so that the browser version keeps working.
43. As the Owner, I want the System Widget in the Jarvis App to keep describing this computer, so that "¿cuánta batería me queda?" still answers about my machine.

### Plugins

44. As the Owner, I want installing or reconnecting a Plugin from the Marketplace in the Jarvis App to open the sign-in in my own browser, so that Google lets me sign in.
45. As the Owner, I want the sign-in to finish successfully in my browser even though it started in the Jarvis App, so that the Plugin becomes Connected.
46. As the Owner, I want the Marketplace in the Jarvis window to show the Plugin as Connected when I come back to it, so that I don't have to reload it by hand.
47. As the Owner, I want a sign-in I abandoned to expire after a while, so that it can't be completed much later.
48. As the Owner using a browser tab, I want installing a Plugin to work as it does today, so that nothing changes for the browser version.

### Building and developing

49. As the developer, I want one command that runs `next dev` and opens the Jarvis App on it, so that I can work on desktop features with hot reload.
50. As the developer, I want the default `pnpm dev` to keep starting only the web app, so that the browser workflow doesn't open an Electron window every time.
51. As the developer, I want one command that builds the web app and packages the Jarvis App for Linux, so that installing a new version is one step.
52. As the developer, I want the Jarvis App's own logic tested without launching Electron, so that it's covered by the usual test run.
53. As the developer, I want all of Jarvis's features to stay in `apps/web`, with the Jarvis App only adding what a browser can't do, so that there is one app to maintain.

## Implementation Decisions

### Shape (ADR 0009)

- A new `desktop` workspace in the monorepo, an Electron app. It depends on `web` but adds no Jarvis feature of its own. Everything a browser tab could do stays in `apps/web`.
- The web app is built with Next's standalone output, traced from the monorepo root so workspace packages are included. The Jarvis App packages that standalone server together with its static assets and the database migrations folder.
- The server runs in an Electron utility process (Electron's own Node, never the system's), started with the standalone app folder as its working directory, because migrations are found relative to it. `better-sqlite3` needs no rebuild: its prebuilt binary is a Node-API addon, which loads in Electron's Node as it is, so packaging only checks that it's there.
- Server environment: `HOSTNAME=127.0.0.1`, `PORT` from `JARVIS_PORT` or 3737, `JARVIS_DB_PATH` under the app's config directory, and every variable from `jarvis.env`. Unset optional keys behave as today (e.g. no Composio key means Plugins show "No configurado").
- The window is shown once the server answers over HTTP. If the server exits or doesn't answer within a time limit, the Jarvis App shows an error dialog with the reason and the log file path, then quits. Server output goes to a log file in the config directory.
- Packaging: electron-builder, Linux target (AppImage) plus a `.desktop` entry. No signing, no auto-update and no Windows/macOS targets yet.
- Dev mode: the Jarvis App opens the `next dev` server on port 3000 instead of starting its own. A separate dev command (not the default `pnpm dev`) runs both.

### The App controller (new seam in `desktop`)

The Jarvis App's decisions live in one plain module, the **App controller**. It is built from ports, so it never touches Electron directly:

- **Server**: start, wait until it's ready, stop, plus an "exited" event.
- **Windows**: the Jarvis window (show, hide, focus, is it visible, send to its page) and the Floating Orb window (show, send to its page).
- **Shortcuts**: register Push-to-talk, emitting `pressed` and `released`.
- **Tray**: optional. Shows "Mostrar Jarvis" and "Salir" when the desktop has a tray.
- **Shell**: open a URL in the Owner's browser.
- **Dialogs**: show an error.

The controller decides:

- launch → start the server → once ready, create both windows, showing the Jarvis window unless launched with `--hidden`; the Floating Orb is always shown
- a second launch → show and focus the Jarvis window
- closing the Jarvis window → hide it
- "Salir de Jarvis" or tray "Salir" → stop the server, then quit
- server exits unexpectedly → error dialog, then quit
- shortcut `pressed`/`released` → send Push-to-talk press/release to the Jarvis page, without showing or focusing the window
- Floating Orb hold → the same press/release
- Floating Orb click → show and focus the Jarvis window
- Jarvis State from the Jarvis page → forwarded to the Floating Orb
- any navigation or new window to an origin other than Jarvis's own → open it in the Owner's browser and cancel it in the app

A thin Electron adapter wires the real Electron APIs to these ports. It also:

- keeps a single instance with Electron's lock
- grants the microphone and location (for the Weather Widget) permissions only to Jarvis's own origin, and refuses every other permission
- turns off background throttling on the Jarvis window, so recording and Speaking work while it's hidden
- remembers the Jarvis window's bounds

### Push-to-talk from any app (Wayland portal)

- The Shortcuts port is backed by the XDG desktop portal's Global Shortcuts interface over the session D-Bus. It opens a portal session, binds one shortcut with id `push-to-talk` (preferred trigger `SUPER+J`), and maps the portal's `Activated` and `Deactivated` signals to `pressed` and `released`.
- On Hyprland the Owner binds the key in `hyprland.conf` against the app's portal app id. The README documents the exact lines, including `exec-once` for `jarvis --hidden` and the window rules that float and pin the Floating Orb by its window class (`Jarvis`, shared by all of the Jarvis App's windows) and its fixed title (`Jarvis Floating Orb`).
- If the portal or the shortcut isn't available, the Jarvis App still runs and logs it; only Push-to-talk from any app is missing.
- Electron's own global shortcut API is not used: it never reports a release.

### The page side: the App Bridge (in `web`)

- The Jarvis App exposes a small, typed API to its pages through a preload script, available only inside the Jarvis App:
  - receive Push-to-talk press/release
  - publish the Jarvis State
  - (Floating Orb page) send hold, release and click
- A browser tab has no such API, and the page must behave exactly as today when it's absent.
- A new **App Bridge** module in the web app connects a Jarvis Session to that API, when present:
  - a press calls `pressPushToTalk`, a release calls `releasePushToTalk`
  - every change of the Session's Jarvis State is published
- Holds started from the Jarvis App don't depend on page focus. The page's existing "a window blur ends the hold" rule applies only to a hold started with Space.
- A new **Floating Orb page** in the web app renders only the Orb, using the same Orb component as the Jarvis page:
  - it shows the Jarvis State it receives from the App Bridge
  - it reports a hold (mouse down to up beyond a short threshold) as Push-to-talk press/release, and a short click as "show the Jarvis window"
  - it has no Session of its own, and outside the Jarvis App it shows nothing useful (it isn't linked from anywhere)
- Audio capture and Speaking stay in the Jarvis page's Session. The Floating Orb only relays.

### Plugins: a pending install no longer lives in a cookie

- Today the in-progress install (Plugin, OAuth state, connected account) is kept in a cookie scoped to the callback path. Inside the Jarvis App the cookie would sit in the app's window while the callback arrives in the Owner's browser, so the install would fail.
- The Plugins module keeps pending installs itself, keyed by their random OAuth state, for 10 minutes:
  - `beginInstall` records one
  - `completeInstall` takes the callback's state and status, looks the pending install up, uses it once, and rejects one that is missing, already used or expired
  - no cookie is set or read anymore
- Pending installs are kept in memory, not in the database. A restart in the middle of a sign-in just means signing in again.
- In the Jarvis App, the install action's redirect to the provider's authorization URL is an outside origin, so the App controller opens it in the Owner's browser. The callback reaches the same server at `127.0.0.1:3737`, completes there, and that browser tab shows the Marketplace result.
- The Marketplace page refreshes its Plugin list when its window regains focus or visibility, so the Jarvis window shows the newly Connected Plugin.

## Testing Decisions

- Good tests check behaviour through the highest seam: what the Owner would observe (Jarvis State, which window is shown, what got opened, whether an install completed), never internal calls or private state.
- **App controller** (new, in `desktop`, vitest), with fake ports and no Electron:
  - launch with and without `--hidden`
  - the window is shown only after the server is ready
  - a second launch shows the window
  - closing hides it; quit stops the server first
  - the server dying shows an error and quits
  - shortcut pressed/released reach the Jarvis page without showing it
  - a Floating Orb hold relays press/release, and a click shows the window
  - Jarvis State reaches the Floating Orb
  - an outside URL goes to the Shell and is cancelled; Jarvis's own URLs aren't
- **Config resolution** (in `desktop`): port default and `JARVIS_PORT` override, database path under the config directory, `jarvis.env` parsing (comments, quotes, blank lines), the server always bound to `127.0.0.1`.
- **Portal adapter**: the mapping of `Activated`/`Deactivated` signals for our shortcut id to pressed/released (ignoring other ids), tested with a fake D-Bus. Opening the real portal is checked in the running app.
- **App Bridge** (in `web`): a real Jarvis Session with fake adapters, the way `session.test.ts` already does it.
  - a bridge press then release produces a Turn
  - a short hold is discarded with the usual hint
  - a press while Speaking cuts the Reply
  - every Jarvis State change is published
  - a Jarvis App hold survives a window blur, while a Space hold still ends on blur
  - with no bridge present, nothing is wired
- **Plugins** (in `web`): extend `plugins.test.ts`.
  - begin then complete by state succeeds
  - an unknown, reused or expired state fails
  - the callback no longer needs a cookie
- **In the running app** (manual, recorded in the ticket's Comments as earlier tickets do):
  - starting from the launcher and from `exec-once --hidden`
  - `SUPER + J` from another app while hidden
  - the Floating Orb pinned by the window rule
  - connecting a Plugin through the browser
  - the same Session visible at `127.0.0.1:3737` in the browser
  - the System Widget's numbers
- Prior art: `lib/jarvis/session.test.ts` (Session with fake adapters), `lib/plugins/plugins.test.ts` (Plugins with fixtures), `lib/machine/machine.test.ts` (ports with fakes).

## Out of Scope

- Windows and macOS builds, code signing, auto-update and a first-run settings screen for keys (stored in the system keyring). These wait until someone else installs the Jarvis App.
- A hosted Jarvis server or reaching Jarvis from another device.
- Widgets popping out of the Jarvis window, or anything other than the Orb in the Floating Orb.
- A Reply's text in the Floating Orb.
- Toggle-style Push-to-talk (press to start, press to send).
- Choosing the Push-to-talk key inside the app. It is bound in `hyprland.conf`.
- Starting the Jarvis App at login on desktops other than Hyprland (systemd service, XDG autostart).
- A PWA manifest for the browser version.

## Further Notes

- On Wayland, Electron can ask for "always on top", but Hyprland decides. The Floating Orb relies on the Owner's window rule for its class and title. The README gives it.
- The page already has an Orb (the round button with "Mantén pulsado el orbe…"). The glossary now names it, and the Floating Orb reuses it. Neither is a Widget.
- `apps/web`'s Next.js 16 docs in `node_modules/next/dist/docs/` must be checked for the standalone output and its monorepo tracing option before changing the build. The installed Turborepo's docs must be checked before adding the desktop tasks (AGENTS.md).
- ADR 0009 records why Electron over a PWA, a browser `--app` window with a background service, Tauri, or a hosted server.
