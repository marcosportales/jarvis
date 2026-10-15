# 13: Does Jarvis hear its own Reply on this machine's speakers?

Type: task
Status: resolved
Blocked by: 01, 03

## Question

Nothing to decide. Measure how often Silero VAD (see **Voice detection that runs locally in the browser and the Jarvis App**) fires on the echo-cancelled mic track while Jarvis plays its own Reply, on the Owner's Dell XPS 13 9305 with its built-in speakers and built-in mic. The interrupting decision depends on these numbers.

HITL, because it needs the Owner's machine, speakers and voice:
- Play 20+ real Kokoro Spanish Replies at normal and maximum volume. Count detector triggers, separately for the first ~500 ms, the middle and the tail of each Reply. Do it in the Jarvis App (Electron 44.7.0) and in Google Chrome.
- Try a stricter gate while Speaking (a higher threshold or a longer minimum speech, with a hold-off at the Reply's start and end), and record the setting that reaches zero triggers.
- With that gate on, check that the Owner speaking over a Reply is still detected, and that Whisper still understands it.
- Confirm headphones give zero triggers, and check what happens when the output switches mid-Reply.
- Optional, and only if the Owner agrees to the system change: compare with PipeWire's echo-cancel module loaded temporarily.

Record the trigger counts, the gate setting and the barge-in result in the Answer.

## Answer

**With Chrome on the built-in speakers at normal volume, Jarvis doesn't hear its own Reply, with a wide margin.** Speaking over the Reply is still detected. Measured with Chrome 155 on the Dell XPS 13 9305, using the built-in speakers and built-in mic at 50% system volume. Echo cancellation, noise suppression and auto gain were all on (`{ audio: true }`, as today), with Silero v6.

**Reply alone (20 Kokoro Spanish Replies, about 2.5 minutes of Reply audio):**
- **0 false triggers** in every zone: the first 500 ms of a Reply, the middle, the last 500 ms plus 500 ms after, and the gaps between Replies.
- The highest speech probability Silero gave the Reply was **0.099**, at the start of the first Reply while echo cancellation settles. Everywhere else it stayed below about 0.1, mostly below 0.01. The normal start threshold is 0.3.
- **Gate setting that reaches zero: the normal one** (start 0.3, end 0.25, minimum speech 250 ms, no hold-off). On this evidence, no stricter gate or hold-off is needed while Speaking.

**Barge-in (20 Replies, the Owner speaking over them):**
- 7 of the 18 marked takes started while a Reply was still playing: mid-Reply, within the first second, and just before the end. **All 7 were detected with the normal gate**, about 250 ms (the minimum speech) after the Owner's voice began.
- The other 11 started 150–350 ms after the Reply had ended, so they don't test barge-in. One of them, after Reply 10, never passed 0.19, which looks like quiet speech, not echo.
- In this run the Reply's own frames scored 0.000, so the echo was fully cancelled.

**Not measured; treat as open, not as passed:**
- Whether Whisper understands speech spoken over a Reply. No take was transcribed.
- **The Jarvis App (Electron 44.7.0).** The echo-cancellation research found Google Chrome may ship a residual-echo suppressor that Electron lacks, so Chrome's margin may not carry over.
- Maximum volume, headphones, switching the output mid-Reply, and PipeWire's echo-cancel module.

**For the spec and for "Interrupting: does speaking over Jarvis cut it short?":**
- Barge-in by voice works on the Jarvis page at normal volume with no special gate.
- Keep the gate while Speaking configurable: start threshold, minimum speech, and hold-off at the Reply's start and end.
- Keep half duplex as the fallback until the Jarvis App and maximum volume are checked. Check them with the same page before relying on voice barge-in in the app.

**Prototype:** branch `prototype/hands-free-own-reply-on-speakers`, file `apps/web/public/prototypes/own-reply-on-speakers.html`. Run `pnpm --filter web dev`, then open `/prototypes/own-reply-on-speakers.html`. Its "Download results" JSON holds every frame's probability, so a run can be judged again against any gate.
