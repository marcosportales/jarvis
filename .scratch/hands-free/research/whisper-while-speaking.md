# Can Whisper on Nan transcribe while the Owner is still speaking?

Research for [02: whisper-while-speaking](../issues/02-whisper-while-speaking.md). Measured on 2026-10-15 against `https://api.nan.builders/v1` with the `NAN_API_KEY` from `apps/web/.env.local`. Scripts and raw output are in [`whisper-while-speaking-scripts/`](whisper-while-speaking-scripts/).

## Answer

**No.** Nan only transcribes a finished audio file. It has no realtime or streaming transcription.

- `GET /v1/models` lists one transcription model, `whisper`. The others are chat models, `kokoro`, embeddings, rerank and image models. Nan's models page describes it as Whisper large-v3, "CPU-based STT with CTranslate2 and INT8. ~1x realtime" ([nan.builders/docs/models](https://nan.builders/docs/models)).
- The OpenAI Realtime routes all return HTTP 404: `GET /v1/realtime`, `POST /v1/realtime/sessions`, `POST /v1/realtime/transcription_sessions` and `POST /v1/realtime/client_secrets`. A websocket to `wss://api.nan.builders/v1/realtime` is also rejected with 404. See `probe.py`.
- `stream=true` on `/v1/audio/transcriptions` only looks like streaming. Nan waits until the whole file is done, then returns one `application/json` body. The body's `text` field holds the entire SSE stream as a string: a single `transcript.text.delta` with the full text, then `transcript.text.done`. Nothing arrives earlier. See `probe.py`.
- None of Nan's docs mention streaming or realtime: the API intro ([/docs](https://nan.builders/docs)), the API reference ([/docs/api](https://nan.builders/docs/api), whose page has no content beyond navigation), and the models page.

**The good news: you don't need streaming.** Transcribing a finished Utterance is already fast, and it barely slows down as the Utterance gets longer.

## How transcription time grows with Utterance length

Test audio: a 76 s Spanish monologue made with Kokoro (`em_alex`, 7 sentences with 0.4 s pauses). Each clip starts at a random 0–300 ms offset, so no request hits Nan's cache. Two runs per cell, with `language: "es"`, measured from this machine. Raw data: `bench-results.tsv`.

| Audio | webm/opus 32 kbps (size, time) | wav 16 kHz PCM (size, time) |
|---|---|---|
| 2 s | 9 KB, 1.4–1.9 s | 64 KB, 1.2–2.1 s |
| 5 s | 22 KB, 1.4–2.2 s | 160 KB, 1.35 s |
| 10 s | 41 KB, 2.2–2.5 s | 320 KB, 1.7–1.9 s |
| 20 s | 81 KB, 1.8–2.0 s | 640 KB, 2.5 s |
| 40 s | 164 KB, 2.7–3.4 s | 1.28 MB, 3.0–3.7 s |
| 60 s | 245 KB, 2.4–3.5 s | 1.92 MB, 4.2–4.9 s |
| 75 s | 307 KB, 2.8–2.9 s (4.4 s in a later run) | 2.4 MB, 3.0–3.2 s |

- **There is a fixed cost of about 1.3–2 s per request.** It applies whatever the length. An identical repeat, served from Nan's cache, still took 1.1 s, so most of this is network and proxy overhead, not Whisper.
- **Each extra second of audio adds only about 0.02–0.03 s.** A 75 s Utterance takes about 3 s, a 5 s one about 1.5–2 s. That is far faster than the "~1x realtime" in the docs. That figure may describe a cold or busy server, so treat it as the worst case. These numbers are from one afternoon on one connection.
- **Format:** webm/opus is about 8x smaller than 16 kHz wav, and from about 20 s up it is faster (60 s: about 3 s vs about 4.5 s). Under 10 s there is no clear difference. MediaRecorder already produces webm/opus by default, which is what `browser-adapters.ts` sends today, so nothing needs to change.

## Is chunked transcription viable in Spanish?

Experiment: the same 76 s Utterance transcribed whole and in pieces, as it would be while the Owner is still speaking. WER is measured against the text Kokoro was given. Every variant pays the same penalty for writing numbers as digits ("10" for "diez"), so compare the variants with each other. Raw output: `chunks-results.txt`. Each variant ran once.

| Variant | Requests | WER | Last request after the Owner stops |
|---|---|---|---|
| Whole Utterance, one request | 1 | 3.1% | 4.4 s |
| Blind 5 s chunks | 16 | 4.4% | 1.6 s |
| Blind 10 s chunks | 8 | 3.5% | 1.3 s |
| Blind 10 s chunks + previous text as `prompt` | 8 | **24.2%** | 1.6 s |
| Cut in the pauses between sentences (as voice detection would) | 7 | 3.5% | 1.9 s |
| Cut in pauses + previous text as `prompt` | 7 | 3.1% | 1.7 s |

- **Blind cuts damage words at the edges.** Whisper adds a period where it cut ("comprar leche." / "pan y huevos"), drops or changes the cut word ("olvidar" / "otra vez", "necesita" for "necesito"), and invents an ending for a sentence cut short. In the side check (`prompt-name-results.txt`), a 4 s cut became "organizar la reunión" and "organizar la sesión".
- **Feeding the previous text as `prompt` on blind cuts is dangerous.** In one 10 s chunk Whisper hallucinated "Gracias por ver el video." (a known Whisper failure) and lost whole phrases.
- **Cutting at pauses is as accurate as one request.** Chunks that end in a real silence give 3.1–3.5% WER, the same as the whole Utterance.
- **The time saved is small, and only for long Utterances.** After the Owner stops, only the last chunk is left: about 1.3–1.9 s, versus about 3–4.4 s for 75 s sent whole. For a typical 2–10 s request, the whole Utterance already takes about 1.4–2.5 s. Chunking saves almost nothing there, because the per-request floor (about 1.3 s) dominates.
- **Rate limit:** Whisper allows **10 requests per minute per key** ([models page](https://nan.builders/docs/models)), and the key also has a 60 requests/min cap across all models ([/docs](https://nan.builders/docs)). Blind 5 s chunks of continuous speech would hit the 10 per minute limit (12/min). Pause-based chunks of about 10 s use about 6 per minute, which leaves little headroom for back-and-forth.

## Upload limits and formats

From the [models page](https://nan.builders/docs/models):
- **25 MB per request.** OGG/Opus and MP3 are recommended ("smaller files, same transcription quality").
- **Audio longer than about 2 minutes may get a 524 timeout from the proxy**, and Nan advises splitting into segments of 2 minutes or less. That matters for very long Utterances (see the map's "Not yet specified"). In practice it caps one request at about 2 minutes, not 25 MB: 2 minutes of webm/opus is about 0.5 MB.
- **Inputs tested:** webm/opus (sent as `audio/webm`) and wav both work.
- `response_format: "verbose_json"` with `timestamp_granularities[]=word` returns word timings and per-segment `no_speech_prob`. These could help join pieces or reject silence (see `probe.py` output).

## Practical notes for the spec

- **MediaRecorder:** with a `timeslice`, only the first blob carries the WebM header. The later blobs are fragments of one stream, not files that can be sent on their own ([W3C MediaStream Recording, `start(timeslice)`](https://www.w3.org/TR/mediastream-recording/#dom-mediarecorder-start)). Transcribing pieces would mean either stopping and restarting the recorder at each pause, or encoding the PCM frames from voice detection on the client.
- **"Jarvis" is often heard as "Harviss" / "Harveys" / "Harvis"** in this Kokoro audio. `prompt: "Jarvis"` did not fix it (3 of 4 runs still wrong). This may be because Kokoro says it with a Spanish J. It needs checking with the Owner's real voice before anyone relies on the name, for example as a wake word.

## Open items

- Every measurement used Kokoro audio. Real-mic audio (noise, accent, hesitations, mid-sentence pauses) may change the chunk-edge results. Re-run `chunks.py` on a real recording.
- Each chunking variant ran once and the latency cells twice. Latency varies (75 s webm took 2.8–4.4 s). A busier Nan, or the "~1x realtime" in the docs, could make long Utterances much slower. In that case, transcribing in pauses would matter more.
- Nan does not document how its cache works. Here a byte-identical repeat hit the cache; whether changing only a form field (such as the filename) also busts it was not tested.

## Sources

- Nan models page: https://nan.builders/docs/models (Whisper large-v3 on CPU, ~1x realtime, 10 rpm, 25 MB, 524 after ~2 min, recommended formats)
- Nan API intro: https://nan.builders/docs (base URL, per-key limits)
- Nan API reference: https://nan.builders/docs/api (only navigation, no endpoint content)
- Live probes: `GET /v1/models`, the Realtime routes, `stream=true` and `verbose_json` (`probe.py`, output reproduced above)
- W3C MediaStream Recording: https://www.w3.org/TR/mediastream-recording/#dom-mediarecorder-start
