---
status: accepted
---

# The Jarvis App is an Electron shell around the web app

The Jarvis App is a new `apps/desktop` workspace: an Electron app that runs the built Next.js server of `apps/web` inside itself and opens windows onto it. All of Jarvis stays in `apps/web`; the shell only adds what a browser tab can't do — starting with the computer, living on with its window closed, Push-to-talk held from any other app, and the Floating Orb above every other app. Jarvis's server has to run on the Owner's own computer: it holds the keys, keeps Sessions and Memories in a local SQLite file, and the System Widget reads the computer it runs on.

We considered a PWA, which gives Jarvis its own window but can't start or keep the server running, and can't hear a key while another app is focused. A plain `chromium --app` window over a background service gives the window and the autostart for almost nothing, but no global key, tray or Floating Orb. Tauri would be smaller, but on Linux it renders with WebKitGTK, the weakest engine for microphone capture and audio, which Push-to-talk depends on, and it would still need a Node binary shipped beside it to run the server. Hosting the server would let Jarvis be reached from anywhere, but the System Widget would then describe the host, not the Owner's computer, and Memories would leave it.

## Consequences

- The server runs in an Electron background process, never on the system's Node, so the Jarvis App needs nothing installed beside it. `better-sqlite3` is a native module, but its prebuilt binary is a Node-API addon, which loads in Electron's Node without a rebuild; packaging only checks that it's there. A native module that isn't Node-API would have to be rebuilt for Electron.
- Electron's own global shortcuts only report a key going down, so holding Push-to-talk from another app goes through the XDG desktop portal's Global Shortcuts over D-Bus, which reports press and release. The same key now also turns Hands-free on or off with a tap ([ADR 0011](0011-hands-free-replaces-push-to-talk.md)), which needs press and release too. On Hyprland the Owner binds the key in `hyprland.conf`; KDE and GNOME offer the same portal.
- On Wayland the compositor, not the app, decides what floats and stays on top; the Floating Orb's window is matched by a window rule that floats and pins it. Electron gives every window of an app the same Wayland app id (X11 class), `Jarvis`, which the portal also needs, so the Floating Orb can't have a class of its own: the rule matches that class together with the Floating Orb's fixed title, `Jarvis Floating Orb`, which its page can't change.
- Google refuses sign-in inside embedded app windows, so connecting a Plugin opens the Owner's own browser, which reaches the same server.
- Only the Owner's Arch Linux (Hyprland) machine is supported for now; nothing machine-specific is baked in, so installers for other systems can come later.
