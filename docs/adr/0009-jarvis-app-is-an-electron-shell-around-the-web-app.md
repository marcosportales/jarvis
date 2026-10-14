---
status: accepted
---

# The Jarvis App is an Electron shell around the web app

The Jarvis App is a new `apps/desktop` workspace: an Electron app that runs the built Next.js server of `apps/web` inside itself and opens windows onto it. All of Jarvis stays in `apps/web`; the shell only adds what a browser tab can't do — starting with the computer, living on with its window closed, Push-to-talk held from any other app, and the Floating Orb above every other app. Jarvis's server has to run on the Owner's own computer: it holds the keys, keeps Sessions and Memories in a local SQLite file, and the System Widget reads the computer it runs on.

We considered a PWA, which gives Jarvis its own window but can't start or keep the server running, and can't hear a key while another app is focused. A plain `chromium --app` window over a background service gives the window and the autostart for almost nothing, but no global key, tray or Floating Orb. Tauri would be smaller, but on Linux it renders with WebKitGTK, the weakest engine for microphone capture and audio, which Push-to-talk depends on, and it would still need a Node binary shipped beside it to run the server. Hosting the server would let Jarvis be reached from anywhere, but the System Widget would then describe the host, not the Owner's computer, and Memories would leave it.

## Consequences

- `better-sqlite3` is a native module and must be rebuilt for Electron's Node; the server runs in an Electron background process, never on the system's Node, so the Jarvis App needs nothing installed beside it.
- Electron's own global shortcuts only report a key going down, so holding Push-to-talk from another app goes through the XDG desktop portal's Global Shortcuts over D-Bus, which reports press and release. On Hyprland the Owner binds the key in `hyprland.conf`; KDE and GNOME offer the same portal.
- On Wayland the compositor, not the app, decides what floats and stays on top; the Floating Orb's window has a fixed class so a window rule can float and pin it.
- Google refuses sign-in inside embedded app windows, so connecting a Plugin opens the Owner's own browser, which reaches the same server.
- Only the Owner's Arch Linux (Hyprland) machine is supported for now; nothing machine-specific is baked in, so installers for other systems can come later.
