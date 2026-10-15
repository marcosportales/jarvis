# 11: Does this spec also shorten Thinking?

Type: grilling
Status: open
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
