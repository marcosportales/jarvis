# 03: Hands-free cues: on/off and Turn-sent sounds

**What to build:** The Owner hears a short sound when Hands-free turns on and a different one when it turns off, so a tap made without looking is confirmed. A soft, non-verbal acknowledgement plays the moment any Turn is sent (hands-free, Push-to-talk or typed), as Jarvis goes into Thinking. The sounds are placeholders that are easy to tell apart; ticket 14 on the map, **How the Orb, Floating Orb and Caption show Hands-free and the cues**, picks the real ones.

**Blocked by:** 02: A hands-free Turn on the Jarvis page

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] The on and off sounds play on every toggle, from any source
- [ ] The acknowledgement plays once per Turn sent, for spoken and typed Turns alike, and never for a dropped Utterance
- [ ] The three sounds are short, played locally, and clearly distinct; a fourth slot exists for the queued-speech cue
- [ ] Session tests check which cue was asked for, through a fake sound adapter, not the audio itself
