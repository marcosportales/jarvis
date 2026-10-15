# 13: Does Jarvis hear its own Reply on this machine's speakers?

Type: task
Status: claimed
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
