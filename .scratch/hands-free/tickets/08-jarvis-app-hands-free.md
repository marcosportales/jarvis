# 08: Hands-free in the Jarvis App, window closed included

**What to build:** In the Jarvis App, the Owner can tap the global key from any other app, or click the Floating Orb, to turn Hands-free on or off, and still hold either for Push-to-talk. With every Jarvis window closed, Jarvis keeps listening, and the Floating Orb shows the Jarvis State and whether the mic is open. The tray menu gets a "Stop listening" item.

**Blocked by:** 02: A hands-free Turn on the Jarvis page

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] The global key's press and release reach Orb input, which tells a tap from a hold; the XDG portal path is unchanged (ADR 0009)
- [ ] A click on the Floating Orb is a tap
- [ ] The Jarvis State relayed to the Floating Orb also carries `micOpen` and `handsFree`, and the Floating Orb shows the placeholder mic-open look
- [ ] The shell tells the Jarvis page when its window is hidden or shown, and the page keeps listening either way
- [ ] A "Stop listening" tray item turns Hands-free off; optionally, the tray icon changes while the mic is open
- [ ] App bridge tests cover the tap, the relayed mic state and the visibility notice; the bridge type still matches the desktop copy; desktop shell tests cover the tray item and the visibility notice
- [ ] Checked by hand: Hands-free on, window closed, a spoken Turn from another app
