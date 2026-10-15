# 09: Privacy: when is the mic open, and how does the Owner know?

Type: grilling
Status: resolved
Blocked by: 05, 07

## Question

- Does the mic stay open while the Jarvis App runs with its window closed, and does it open on its own when the computer starts?
- What always shows the Owner that the mic is open: the Orb, the Floating Orb, a tray icon, the system's own indicator, or a sound? Does it still show when every Jarvis window is closed?
- How does the Owner close the mic quickly (mute), and does mute survive a restart?
- Is any audio ever kept, locally or at Nan, beyond the Utterances that become Turns?

## Answer

**Hands-free is always off when Jarvis starts.** That holds when the Jarvis App starts with the computer and when the Jarvis page opens in a browser. It is never restored from last time, so the mic never opens without the Owner acting. How the mic comes back after the Jarvis page crashes or reloads is left to the Failure and Jarvis Health fog.

**Closing the Jarvis window leaves hands-free on.** "Works with the window closed" is part of the Destination, and the Floating Orb, always on screen while the Jarvis App runs, still shows that the mic is open.

**What shows the mic is open:**
- The Orb and the Floating Orb take a distinct look whenever the mic is open, whether hands-free is on or a Push-to-talk hold is in progress. In the Jarvis App the Floating Orb can't be closed, so this still shows when every Jarvis window is closed.
- A short sound plays when hands-free turns on and another when it turns off, so a tap of the global key made without looking is confirmed.
- Nice to have: the tray icon changes too, on desktops that have a tray.
- On the Jarvis page the browser's own recording indicator also shows. The system shows nothing in the Jarvis App (Hyprland, Caelestia), and adding a PipeWire indicator to Caelestia is outside Jarvis.

**There is no separate mute. Turning hands-free off is the mute:** a tap on the Orb, the Floating Orb, Space, or the global key, plus a "Stop listening" item in the tray menu. It closes the mic completely, and because of the first rule the mic never reopens on its own, not even after a restart.

**Kept audio: a firm rule.** Jarvis never stores audio, neither on the computer nor in Sessions. Audio leaves the computer only to be transcribed by Nan, and only an Utterance's text reaches the Transcript. Jarvis doesn't control what Nan keeps (it caches identical requests at least), and that's accepted, as it already is under Push-to-talk. False triggers that reach Nan belong to the **Other voices in the room** fog.
