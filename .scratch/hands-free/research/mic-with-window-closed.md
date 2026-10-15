# Research: Where does the mic live when the Jarvis window is closed?

Answers [issue 05](../issues/05-mic-with-window-closed.md). Checked against the code at `015d446` (Electron 44.7.0) and the primary sources linked inline.

## Answer

The Jarvis window's renderer is never destroyed while Jarvis runs. Closing the window only hides it, and its page keeps running unthrottled. Push-to-talk from any app already captures the mic from that hidden page. So **the hidden Jarvis page is where the mic and local voice detection should live**, in the Jarvis App and in a browser tab alike. It needs no new window or process, and only a small change to the shell (below). The Floating Orb could hold the mic too, but that would split one Session across two renderers. An offscreen window or a `utilityProcess` with native capture would also work, but each costs more for nothing gained.

## What happens today when the Owner closes the Jarvis window

- `main.ts` handles the window's `close` event by asking the controller first. `controller.closeJarvisWindow()` calls `windows.hideJarvis()` and returns `"deny"`, so `event.preventDefault()` keeps the window alive. It returns `"allow"` only while quitting (`apps/desktop/src/controller.ts`, `closeJarvisWindow`; `apps/desktop/src/main.ts` lines 194–197). The `window-all-closed` listener is empty because "the Jarvis window is hidden, never closed" (`main.ts` line 111).
- The Jarvis window is created with `webPreferences.backgroundThrottling: false`, commented "Listening and Speaking go on while the window is hidden" (`main.ts` lines 184–186).
- `--hidden` (the `exec-once` start at login) still loads the Jarvis page. It just never shows it (`controller.ts`, `launch`). The renderer therefore exists from login, even if the Owner never opens the window.
- Push-to-talk from any app reaches that hidden page over IPC, without showing or focusing it (`controller.ts`, `sendPushToTalk`). Each hold calls `getUserMedia({ audio: true })` in that page (`apps/web/lib/jarvis/browser-adapters.ts` line 57). Its acceptance criterion is "holding `SUPER + J` in another app while Jarvis is hidden makes a Turn that is Spoken" (`.scratch/jarvis-app/issues/04-push-to-talk-from-any-app.md`). **Capturing the mic from the hidden Jarvis page is therefore already shipped behaviour, not a hypothesis.**
- **The Floating Orb survives too.** Its `close` is denied unless quitting (`controller.closeFloatingOrb`). It is always shown, even with `--hidden`. It also runs with `backgroundThrottling: false`, `sandbox: true`, on the default session (`apps/desktop/src/floating-orb-window.ts`).

## Media permission for a hidden window

- `grantPermissionsToJarvis` installs a permission request handler and a check handler on `session.defaultSession`. They grant `media` (audio only, never video) to any page on Jarvis's own origin (`main.ts` lines 121–144; `apps/desktop/src/permissions.ts`). Neither handler looks at visibility or focus. Both windows share that session, so both would be granted the mic. No prompt is ever shown.
- The Media Capture spec has `getUserMedia` wait while the document is not "in view" (step 11.1). It also waits for system focus when a prompt is needed (step 11.7). Its track life-cycle says a UA "SHOULD … mute the track" when the document is not in view ([Media Capture and Streams](https://w3c.github.io/mediacapture-main/)). In the Jarvis App none of this applies:
  - Electron says that with `backgroundThrottling` disabled, "the visibility state will remain `visible` even if the window is minimized, occluded, or hidden." It also says the initial state is `visible` even with `show: false` ([BrowserWindow, Page visibility](https://www.electronjs.org/docs/latest/api/browser-window)).
  - The permission handler answers without a prompt.
  - Shipped Push-to-talk-while-hidden confirms it in practice.

## Throttling and AudioWorklet timing

- `backgroundThrottling` is "Whether to throttle animations and timers when the page becomes background. This also affects the Page Visibility API" (`node_modules/electron/electron.d.ts`, `WebPreferences.backgroundThrottling`). With it off, a hidden Jarvis window behaves like a visible one: timers, `requestAnimationFrame`, `message` events and `visibilityState` all run as normal.
- An AudioWorklet's `process()` runs on the audio rendering thread (`AudioWorkletGlobalScope`), called "in an isochronous fashion" by the audio engine, not by the main thread's timers ([Chrome: Enter Audio Worklet](https://developer.chrome.com/blog/audio-worklet)). Chrome's background throttling covers JS timers (`setTimeout`/`setInterval`) ([Chrome 88 timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)). So frame-by-frame voice detection inside the worklet keeps its timing even when throttled. Only the main-thread side would be delayed: the code receiving the worklet's messages, and any timer-driven end-of-turn logic. In the Jarvis App that side isn't throttled either.
- The cost: an unthrottled hidden window keeps drawing frames. Electron's docs: "frames will be drawn and swapped for the whole window." Electron recommends pausing expensive work when hidden. Since the page always reports `visible`, it can't use the Page Visibility API to notice it's hidden. If the Orb's animation matters for "almost free" waiting, the shell would have to tell the page itself (open item).

## The options

| Place | Mic API | Survives window close | Cost / catch |
|---|---|---|---|
| **Hidden Jarvis window (today's renderer)** | `getUserMedia` + AudioWorklet, the same code as the browser tab | Yes: hidden, never destroyed; unthrottled | One code path for page and app. The capture already lives here. Catch: it keeps painting while hidden. |
| Floating Orb window | `getUserMedia` works (same session, same grant) | Yes: always shown, close denied | Splits the Turn: Utterances would be captured in one renderer while the Session, Transcript and Reply play in another. Every boundary would need new IPC. It would also go against CONTEXT.md, where the Floating Orb "holds nothing else". |
| Separate hidden "listener" BrowserWindow | `getUserMedia` | Yes, if its close is denied like the others | A third renderer (more memory) with the same IPC split as the Floating Orb, and nothing gained over the Jarvis window, which is already hidden and alive. |
| Offscreen window (`webPreferences.offscreen`) | `getUserMedia` (full renderer) | Yes | Offscreen rendering paints into a bitmap for the app to consume. It is meant for capturing frames, not for running headless. It is the same as a hidden window, with more machinery. |
| `utilityProcess` + native capture | None: `utilityProcess.fork` gives a Node.js child "with Node.js and message ports enabled" ([utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process)), with no Web APIs | Yes, independent of windows | Needs a native capture path: a PipeWire/Pulse Node addon, or reading PCM from `pw-record`/`parecord` on stdout. Voice detection would need a Node runtime (for example `onnxruntime-node`). It is a second implementation beside the browser tab's, it is Linux-specific, and its Utterances still have to cross to the page. Only worth it if renderer capture proves unreliable. |

## What the system shows while an app holds the mic

- Hyprland has no mic indicator of its own. The XDG desktop portal has a Camera portal ("enables applications to access camera devices"), but no microphone portal ([Camera portal](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Camera.html)). An unsandboxed app like the Jarvis App (an AppImage, not a Flatpak) opens the mic straight through PipeWire (Chromium's Pulse backend → `pipewire-pulse`). No system prompt or portal dialog ever appears.
- What *can* show it is whatever bar watches PipeWire nodes. Waybar's privacy module "displays if any application is capturing audio, sharing the screen or playing audio", hidden when idle ([Waybar wiki](https://github.com/Alexays/Waybar/wiki/Module:-Privacy)). Its source counts PipeWire nodes of the audio-input type in the `RUNNING` state (`src/modules/privacy/privacy.cpp`, `PipewireBackend::PRIVACY_NODE_TYPE_AUDIO_INPUT`). Noctalia's privacy widget works the same way, from PipeWire stream links ([Noctalia docs](https://docs.noctalia.dev/v5/bar/widgets/privacy/)).
- **The Owner's machine runs Caelestia shell, not Waybar** (`caelestia` process; `/etc/xdg/quickshell/caelestia`). A grep of its QML for `privacy`/`Stream/Input/Audio` finds only its own screen recorder, so it has no mic-in-use indicator. With an always-open mic, nothing in the system would show it. Hard limit 3 ("the Owner can always tell whether the mic is open") then falls on Jarvis itself: the Floating Orb, which is always shown, is the natural place (issue 09). `pactl list source-outputs` or `pw-top` show the stream on demand.
- A detail that matters for an indicator: a live `getUserMedia` track keeps its PipeWire input stream running even through silence. A Waybar-style indicator would stay lit the whole time Jarvis is waiting, not only while the Owner speaks (worth confirming with `pw-top`).

## Comparison: the Jarvis page in a background browser tab

- A tab has no `backgroundThrottling` switch. Hidden pages get timer throttling: once per second, and once per minute under intensive throttling. Intensive throttling is skipped while a "live" `MediaStreamTrack` exists or the page made sound in the last 30 seconds ([Chrome 88 timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)). An open mic therefore keeps a tab out of the worst throttling. The worklet's own timing is unaffected, but main-thread timers (end-of-turn pause) may fire up to ~1 s late.
- Chrome may freeze or discard hidden pages. Pages seen "playing audio" or "using WebRTC" "won't be discarded unless under extreme resource constraints" ([Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)). Whether a mic-only `getUserMedia` (no `RTCPeerConnection`) counts as "using WebRTC" for Chrome's discard heuristics isn't stated (open item).
- Per the spec, a tab must be in view to *start* `getUserMedia`, and the UA should mute tracks when it goes out of view. Chrome doesn't mute audio tracks of hidden tabs in practice (open item: verify). So in a tab the mic has to be opened while the tab is visible, and kept open. Today's per-hold `getUserMedia` wouldn't start from a background tab.
- A tab shows the browser's own recording indicator on the tab. The Jarvis App has nothing like it.

## Recommendation

Keep the mic and local voice detection in the **Jarvis page in the hidden Jarvis window**: one `getUserMedia` stream held open, feeding an AudioWorklet. The same code runs in a browser tab. What the shell needs to do:

1. Nothing for survival or permission. The window already outlives "close", is unthrottled, and is granted audio without a prompt.
2. Tell the page when its window is hidden or shown, over the existing `PAGE_CHANNEL`/`window.jarvisApp`. With throttling off, the page can't learn this from `visibilityState`. The page can then stop the Orb's animation and any rendering while it waits, which keeps waiting cheap.
3. Make the Floating Orb, always shown, carry the "mic is open" signal (issue 09). The Owner's desktop shows nothing else.

The Floating Orb, an extra hidden or offscreen window, and a `utilityProcess` are fallbacks, in that order. Use them only if long-running capture in the Jarvis renderer turns out to break, for example after a device switch or a renderer crash.

## Open items

- Measure the idle cost of the hidden, unthrottled Jarvis window with the mic open (CPU from painting plus the worklet), with and without the page pausing its animation.
- Confirm with `pw-top`/`pactl list source-outputs` that the stream stays `RUNNING` through silence, and what `application.name` it shows (Jarvis, Electron or Chromium).
- Whether to put a PipeWire privacy indicator in Caelestia (outside Jarvis), or rely on the Floating Orb alone.
- In a browser tab: whether a mic-only live track protects against Chrome's tab discarding / Memory Saver, and whether Chrome ever mutes a hidden tab's audio track.
- What happens to an open stream if the renderer crashes or reloads. Nothing in the shell reopens the mic or reloads the page today.
