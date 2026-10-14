# 04: Push-to-talk from any app with SUPER + J

**What to build:** Holding `SUPER + J` while any other app is focused works exactly like holding Space on the Jarvis page: hold to capture an Utterance, release to send it. It works even while the Jarvis window is hidden, and never shows or focuses it.
- The Shortcuts port is backed by the XDG desktop portal's Global Shortcuts over the session D-Bus. The adapter binds the shortcut id `push-to-talk` (preferred `SUPER+J`) and maps `Activated`/`Deactivated` for that id to pressed/released.
- If the portal or the shortcut is unavailable, the app runs and logs it.
- Electron's own global shortcut API is not used: it never reports a release.
- The controller sends press/release to the Jarvis page.
- A preload script exposes a small typed API to Jarvis's pages, available only inside the Jarvis App.
- A new App Bridge module in `web` connects the Jarvis Session to that API when present: press/release call the Session's push-to-talk, and every Jarvis State change is published (the Floating Orb uses it in 05). With no API, nothing is wired and the page behaves as today.
- The page's "a window blur ends the hold" rule applies only to a hold started with Space.
- The README gives the `hyprland.conf` bind line for the portal shortcut.

See `../spec.md` (stories 19–28; "Push-to-talk from any app", "The page side: the App Bridge").

**Blocked by:** 02

**Status:** ready-for-agent

- [x] App Bridge tests, real Jarvis Session with fake adapters (as `session.test.ts`):
  - bridge press then release → a Turn
  - a short hold → discarded with the usual hint
  - a press while Speaking cuts the Reply
  - every Jarvis State change is published
  - a Jarvis App hold survives a window blur, while a Space hold still ends on blur
  - no bridge → nothing wired
- [x] Portal adapter test with a fake D-Bus: our id's `Activated`/`Deactivated` → pressed/released; other ids ignored
- [x] App controller test: shortcut pressed/released reach the Jarvis page without showing or focusing the window
- [ ] In the running app on Hyprland:
  - with the README's bind, holding `SUPER + J` in another app while Jarvis is hidden makes a Turn that is Spoken and appears in the Transcript
  - focus stays in the other app
- [x] Typecheck, lint and the full test suite pass
