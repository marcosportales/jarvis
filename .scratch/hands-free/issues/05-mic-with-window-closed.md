# 05: Can the Jarvis App keep listening with its window closed?

Type: research
Status: open
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
