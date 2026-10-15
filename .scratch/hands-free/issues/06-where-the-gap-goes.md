# 06: Measure where the gap goes between the Owner finishing and Jarvis speaking

Type: task
Status: open
Blocked by: none

## Question

Nothing to decide here. Measure today's Turn timeline from the end of an Utterance to the first sound of the Reply, so the decision about shortening Thinking has numbers to stand on. Time each step: upload, Whisper, the chat model to its first token and to the full Reply, `/api/speech` (Kokoro), and the start of playback.

AFK. Use a few real Spanish Utterances of different lengths (a short command, one sentence, a paragraph), with a nonce in each request because Nan caches identical requests. Record the numbers and the method in the Answer. No product code changes.
