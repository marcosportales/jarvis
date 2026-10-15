# 09: Failures and the Whisper budget

**What to build:** Hands-free never pretends to listen. If the mic is denied, unplugged or fails, or voice detection can't load, Hands-free turns itself off with the inline mic error and the off sound, and typing still works. After a reload the mic stays closed. Near Nan's Whisper limit (10 a minute), Jarvis falls back to one transcription per Turn instead of failing. Speech with no pause at all is cut into a piece before Nan's roughly 2-minute limit. These are safe defaults until the map's fog on failures and on the Whisper budget is resolved.

**Blocked by:** 02: A hands-free Turn on the Jarvis page

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] A Listener failure, or opening it being rejected, turns Hands-free off and shows the inline microphone error; typing still works
- [ ] Hands-free is off after the Jarvis page reloads or crashes
- [ ] The Session counts Whisper calls in a rolling minute; at 8 it stops sending early pieces and sends the whole Utterance as one call at end of turn, and returns to pieces when the count drops
- [ ] Continuous speech is forced into a piece at about 90 s
- [ ] Session tests cover the failure paths, the budget fallback and the forced piece
