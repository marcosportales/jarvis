# 05: Can the Jarvis App keep listening with its window closed?

Type: research
Status: resolved
Blocked by: none
Findings: branch `research/hands-free-mic-with-window-closed`, file `.scratch/hands-free/research/mic-with-window-closed.md`

## Question

The Jarvis App keeps running with its window closed (ADR 0009). Where can the mic stay open, and voice detection keep running, at that point, and what does it take?

Read `apps/desktop/src` (`main.ts`, `floating-orb-window.ts`, `permissions.ts`, `controller.ts`) and the Electron docs to find out:
- What happens to the main window's renderer when the Owner closes the window today: is it destroyed or hidden? Does the Floating Orb's renderer survive, and could it hold the mic?
- The options: keep a hidden BrowserWindow, use the Floating Orb window, an offscreen window, or a `utilityProcess` (it has no `getUserMedia`, so it would need a native capture path). Note how hidden or background renderers are throttled (`backgroundThrottling`) and what that does to AudioWorklet timing.
- How the shell handles media permission for a hidden window, and what the system shows on Hyprland/PipeWire while an app holds the mic (portal indicators, Waybar privacy module).
- For comparison, what a browser tab in the background can and can't do.

End with a recommended place for the mic and voice detection in the Jarvis App.

## Answer

Closing the Jarvis window only hides it (`controller.closeJarvisWindow()` refuses the close unless Jarvis is quitting). Its renderer keeps running with `backgroundThrottling: false`, which keeps `visibilityState` at `visible`. Push-to-talk from another app already calls `getUserMedia` in that hidden page. Media permission is granted to Jarvis's origin without a prompt, visible or not.

The Floating Orb survives too, but giving it the mic would split a Turn across two renderers, and the Floating Orb "holds nothing else". An extra hidden or offscreen window gains nothing. A `utilityProcess` would need native PipeWire capture and a second voice detection written in Node. AudioWorklet timing runs on the audio thread, so it doesn't drift under throttling.

**Recommendation:** run the mic and voice detection in the Jarvis page inside the hidden Jarvis window, the same code a browser tab runs. The shell then has to:
- Tell the page when its window is hidden or shown, so it can pause the Orb's painting. The page can't learn this from `visibilityState`.
- Have the Floating Orb carry the mic-open signal. Hyprland shows nothing, the XDG portal has no microphone portal, and the Owner's Caelestia shell has no mic-in-use indicator.

Still to check:
- The idle CPU of the hidden window with the mic open.
- That `pw-top` shows the stream RUNNING through silence.
- Whether a mic-only track stops Chrome from discarding a background tab. Today's per-hold `getUserMedia` can't start from a background tab.
- How the mic recovers after the renderer crashes or reloads.
- Whether to add a PipeWire privacy indicator to Caelestia, outside Jarvis.

Findings: branch `research/hands-free-mic-with-window-closed`, file `.scratch/hands-free/research/mic-with-window-closed.md`.
