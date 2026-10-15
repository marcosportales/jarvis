# 11: Does this spec also shorten Thinking?

Type: grilling
Status: resolved
Blocked by: 02, 06

## Question

"The gap between the Owner finishing and Jarvis starting to answer should be as short as possible." Once the end-of-turn pause is decided, the rest of that gap is Thinking. [Measure where the gap goes](06-where-the-gap-goes.md) puts it at 7–15 s today:
- Whisper takes 1–2.5 s.
- Composio Plugin setup adds 2–2.5 s to every Turn.
- Each chat model call costs 2–3 s, however big the prompt, and a tool Turn makes three.
- Kokoro takes 1–1.7 s.

Is cutting that part of the gap in this spec, or left to a later effort? If it's in scope, which of these?
- Set the Plugins up once instead of on every Turn, or in parallel with transcription.
- Fewer chat model calls per Turn, e.g. Showing a Widget without its own call.
- Play an acknowledgement sound right away.
- Speak the Reply sentence by sentence as it streams. Measured at most 1–2 s saved, and only on long Replies.
- Transcribe during the Utterance. Pays off only for long monologues, per [Can Whisper on Nan transcribe while the Owner is still speaking?](02-whisper-while-speaking.md).

## Answer

**Partly. This spec shortens Thinking only where hands-free makes it possible or nearly free: Plugin setup starts while the Owner is still speaking, and an acknowledgement sound plays the moment a Turn is sent. Everything else goes to a later "Faster Turns" effort.**

- **Plugin setup starts during the Utterance.** Hands-free knows when the Owner *starts* speaking, which Push-to-talk never told Jarvis. Plugin setup (2–2.5 s, measured in [Measure where the gap goes](06-where-the-gap-goes.md)) starts once about 500 ms of speech has been heard, the same bar as Interrupting, so coughs and "mm-hm" never start it. It runs in parallel with the rest of the Utterance and the ~1200 ms end-of-turn pause, so on almost every Turn it is finished before the model is called. A Push-to-talk hold starts it the same way. Each Turn still gets its own fresh setup.
- **A setup that's never used is kept briefly, then thrown away.** If the Utterance is dropped (noise, another voice, an empty transcript), the setup waits for the next Utterance that starts within about 60 s, so a run of false triggers costs one setup, not one each. After that it's thrown away.
- **An acknowledgement sound plays when a Turn is sent.** It's short, soft and non-verbal, and plays the moment Jarvis goes from Listening to Thinking, on every Turn: hands-free, Push-to-talk, and typed messages too, so a Turn always sounds the same. It must sound different from the hands-free on/off sound and from the cue for speech queued during Thinking. No spoken filler ("a ver…"): that needs Kokoro or recorded clips and gets in the way of Interrupting.
- **Already decided elsewhere:** transcribing during the Utterance is covered by "transcribe early, send late" in [How long a pause means the Owner is done?](10-end-of-turn-pause.md).
- **Out of this spec, into Faster Turns** (`.scratch/faster-turns/idea.md`): fewer chat model calls per Turn (e.g. Showing a Widget without its own call, about 2–3 s on tool Turns), speaking the Reply sentence by sentence as it streams (at most 1–2 s, only on long Replies), and keeping Plugin setup warm across Turns (would also help typed messages, but needs a rule for when to refresh it).

**Expected effect:** about 2–2.5 s off every spoken Turn, taking a short Turn from about 7 s to about 5 s after the Owner stops (plus the pause). The sound fills the silence that's left.
