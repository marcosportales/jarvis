# 05: The Floating Orb

**What to build:** The Floating Orb: the Orb in a small window of its own that the Jarvis App keeps above every other app. It holds nothing else and is not a Widget.

The window:
- It is always shown while the Jarvis App runs.
- It has a fixed window class, so a Hyprland window rule floats and pins it.
- It never takes focus.

The page:
- A new Floating Orb page in `web` renders only the Orb, with the same component as the Jarvis page, and has no Session of its own.
- It shows the Jarvis State it receives through the App Bridge. The controller forwards the Jarvis page's state to it, so both always agree.
- Holding it with the mouse (beyond a short threshold) is Push-to-talk press/release, relayed to the Jarvis page's Session.
- A short click shows and focuses the Jarvis window.

The README gives the window rules that float and pin it.

See `../spec.md` (stories 29–36; "The page side: the App Bridge", "The App controller").

**Blocked by:** 04

**Status:** ready-for-agent

- [x] App controller tests:
  - the Jarvis page's state reaches the Floating Orb
  - a Floating Orb hold relays press/release to the Jarvis page
  - a click shows and focuses the Jarvis window
- [x] Floating Orb page tests:
  - hold vs click by the threshold
  - shows each Jarvis State it receives
- [ ] In the running app on Hyprland, with the README's rules:
  - it floats pinned above other apps without stealing focus
  - it goes Listening → Thinking → Speaking during a `SUPER + J` Turn
  - holding it makes a Turn
  - clicking it brings back the hidden Jarvis window
- [x] Typecheck, lint and the full test suite pass
