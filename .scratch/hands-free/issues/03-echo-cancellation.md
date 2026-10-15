# 03: Echo cancellation so Jarvis doesn't hear its own Reply

Type: research
Status: resolved
Blocked by: none
Findings: branch `research/hands-free-echo-cancellation`, file `.scratch/hands-free/research/echo-cancellation.md`

## Question

With the mic open while Jarvis is Speaking, how do we guarantee that the Reply coming out of the speakers is never picked up as an Utterance, in Chromium on the Jarvis page and in Electron in the Jarvis App, on the Owner's Arch Linux / Hyprland / PipeWire machine?

Find out:
- What `echoCancellation: true` in `getUserMedia` actually cancels in current Chromium and Electron. In particular, is audio played through an `HTMLAudioElement` or the Web Audio API (the Reply plays through `new Audio(blob)` today) used as the echo reference, or only WebRTC peer-connection audio? Has that changed in recent Chromium (system-wide AEC, flags)?
- Linux specifics: PipeWire's echo-cancel module (`libpipewire-module-echo-cancel`), and whether the Jarvis App can rely on it.
- Speakers vs headphones, and what counts as good enough. Residual echo that voice detection still flags is a failure.
- Fallbacks that don't depend on AEC: ignoring voice detection while Speaking (half duplex), raising the threshold during the Reply, or comparing what was heard with the Reply text. Note what each one costs, especially for interrupting Jarvis.

End with the options ranked for this machine, and what needs testing on real hardware.

## Answer

On Linux, Chromium 152 (inside the installed Electron 44.7.0) and Chrome already cancel the Reply. `getUserMedia({audio:true})` defaults to Chrome-wide echo cancellation (`kChromeWideEchoCancellation`, on by default for Linux too). Its reference is everything the same browser instance plays to the same output device, so `new Audio(blob)` and Web Audio count, not only WebRTC peer-connection audio.

Limits:
- It doesn't cancel other processes' audio, and the system-wide `echoCancellation: "all"` exists only on Windows and macOS (Electron issue #47043).
- **The listener must be the player.** The Jarvis page in Chrome and the Jarvis App don't cancel each other's audio.
- It doesn't promise zero leftover echo, and this machine is the hardest case: a Dell XPS 13 9305 with built-in speakers next to the built-in mic. A secondary report says Google Chrome ships a neural residual-echo model by default that Electron may not get.

Options, ranked for this machine:
1. **Built-in echo cancellation plus a stricter voice-detection gate while Speaking:** a higher threshold or minimum speech length, and a short hold-off as the Reply starts and ends. Keeps voice barge-in.
2. **Half duplex as the guaranteed fallback:** ignore voice detection while Speaking and for about 200–400 ms after. Interrupting then moves to an Orb tap or a key.
3. **PipeWire's echo-cancel module with `monitor.mode`:** installed but not loaded, and needs the Owner to opt in to a system config change. Only worth it to also cancel other apps' audio.
4. **Comparing what was heard with the Reply text:** rejected, because it costs a Whisper call, adds latency, and is unreliable.

Real-hardware testing graduated into **Does Jarvis hear its own Reply on this machine's speakers?**

Findings: branch `research/hands-free-echo-cancellation`, file `.scratch/hands-free/research/echo-cancellation.md`.
