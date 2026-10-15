# 02: A hands-free Turn on the Jarvis page

**What to build:** On the Jarvis page, the Owner taps the Orb or Space to turn Hands-free on. From then on Jarvis hears on its own when they start and stop speaking and takes the Turn: Listening while they speak, then Thinking, then Speaking, then back to Idle with Hands-free still on. Another tap turns it off and closes the mic. A press held past about 300 ms is still Push-to-talk. Voice detection is Silero VAD v6 through vad-web, self-hosted, running locally. Speech goes to Whisper in pieces after about 500 ms of quiet, and the Turn is sent after about 1200 ms of quiet, with the pieces' texts joined. The Orb shows whether the mic is open, with a placeholder look; ticket 14 on the map, **How the Orb, Floating Orb and Caption show Hands-free and the cues**, replaces it later.

**Blocked by:** 01: Prefactor: Push-to-talk captures through a Listener

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] Orb input tells a tap (released within about 300 ms) from a hold over Space and the Orb; a tap calls the Session's tap, a hold is Push-to-talk as before; Space inside a typing target does nothing; a hold still belongs to its source and a page blur ends it
- [ ] The Session has a Hands-free on/off and a tap; the snapshot gains `handsFree` and `micOpen` (true while Hands-free is on or a hold is in progress)
- [ ] A Listener built on Silero VAD v6 through `@ricky0123/vad-web`, its model and worklet files self-hosted, with `model: "v6"` set explicitly; one `getUserMedia` stream with echo cancellation on
- [ ] Two pauses over vad-web's per-frame probabilities: a piece after about 500 ms of quiet, end of turn after about 1200 ms; a 400 ms pre-roll keeps the first word; start threshold 0.3, end threshold 0.25, minimum speech 250 ms; all configurable. The pause strategies can be lifted from lane E in the end-of-turn prototype (branch `prototype/hands-free-end-of-turn-pause`)
- [ ] Each piece is transcribed as soon as it is ready, never twice, and the texts are joined in order; the Brain is asked only once the last piece's text is back
- [ ] An Utterance with no words is dropped silently under Hands-free (no hint); Push-to-talk keeps its hint
- [ ] The energy level drives only the Orb's animation, never the gate; audio is held only in memory until its piece is transcribed
- [ ] Hands-free is off when the page loads and after teardown
- [ ] The Orb has a placeholder mic-open look in every Jarvis State, and Idle with Hands-free on looks different from Idle with it off
- [ ] Session tests with fake timers cover a full hands-free Turn, two pieces becoming one message, the silent drop, toggling off closing the Listener (but waiting for a hold's release), and off at start and after teardown; Orb input tests cover tap versus hold at 300 ms
