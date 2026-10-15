# 03: Hands-free cues: on/off and Turn-sent sounds

**What to build:** The Owner hears a short sound when Hands-free turns on and a different one when it turns off, so a tap made without looking is confirmed. A soft, non-verbal acknowledgement plays the moment any Turn is sent (hands-free, Push-to-talk or typed), as Jarvis goes into Thinking. The sounds are placeholders that are easy to tell apart; ticket 14 on the map, **How the Orb, Floating Orb and Caption show Hands-free and the cues**, picks the real ones.

**Blocked by:** 02: A hands-free Turn on the Jarvis page

**Status:** done

Spec: [Hands-free conversation](../spec.md)

- [x] The on and off sounds play on every toggle, from any source
- [x] The acknowledgement plays once per Turn sent, for spoken and typed Turns alike, and never for a dropped Utterance
- [x] The three sounds are short, played locally, and clearly distinct; a fourth slot exists for the queued-speech cue
- [x] Session tests check which cue was asked for, through a fake sound adapter, not the audio itself

## Notes

- The acknowledgement plays when the Turn goes to the Brain, not at the instant of Thinking. Under Hands-free and Push-to-talk, Thinking starts before the words are back, and only the words tell a real Turn from a dropped Utterance. "Never for a dropped Utterance" wins, so a spoken Turn hears it once its pieces are transcribed, which is about 2–3 s after Thinking. A typed Turn hears it at once. Ticket 14 may revisit this trade-off.
- The off sound also plays when a denied mic turns Hands-free off, and when teardown (leaving the Session or the page) turns it off.
- Placeholders are tones made with Web Audio in `apps/web/lib/jarvis/tone-cues.ts`: on rises, off falls, Turn sent is one soft low note, queued speech is a quick high double. Nothing plays `speechQueued` yet; ticket 06 does.
