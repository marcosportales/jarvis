---
status: accepted
---

# The Reply is spoken a sentence at a time, not as streamed audio

Jarvis starts speaking a Reply before it has finished writing it, but each part is synthesized on its own: the Reply's text is cut into chunks at sentence ends, each chunk is one call to Nan's Kokoro, up to two calls run ahead of playback, and the decoded audio is scheduled back to back with the Web Audio API so there is no gap between chunks. Nan's speech endpoint can't stream: measured in October 2026, its first byte came about when its last did, with or without `stream: true`, and a single short sentence took 1–2 s, most of it a fixed cost per call rather than per word.

## Considered Options

- **Streaming audio from one call per Reply.** Not possible on Nan today. Revisit if Nan's Kokoro starts streaming: one call would then replace the chunking, the read-ahead and most of their tests.
- **Playing each chunk in its own `<audio>` element.** Simpler, but leaves an audible gap between sentences.
- **Another speech service that streams.** Would mean leaving the Nan subscription that already pays for the chat model, Whisper and Kokoro.

## Consequences

- Because each call costs about the same whatever its length, a chunk is never shorter than about 40 characters: a lone "Claro." waits for the next sentence. The first chunk is kept as short as the rules allow, as it decides when the Owner first hears Jarvis.
- A failed chunk is retried once; a second failure stops the voice rather than skipping a sentence, and the rest of the Reply is only shown.
