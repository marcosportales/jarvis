# 03: Echo cancellation so Jarvis doesn't hear its own Reply

Type: research
Status: open
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
