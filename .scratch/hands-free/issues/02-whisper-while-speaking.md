# 02: Can Whisper on Nan transcribe while the Owner is still speaking?

Type: research
Status: resolved
Blocked by: none
Findings: branch `research/hands-free-whisper-while-speaking`, file `.scratch/hands-free/research/whisper-while-speaking.md`

## Question

Can transcription start before the Owner finishes, so the gap after the Owner stops shrinks to almost nothing? Or can Whisper on Nan (`api.nan.builders/v1`, OpenAI-compatible, `nanConfig.transcriptionModel`) only transcribe a finished Utterance?

Find out:
- Whether Nan offers a streaming or realtime transcription endpoint (an OpenAI Realtime-style websocket, `stream: true` on `/audio/transcriptions`, or similar), and which transcription models it lists.
- If not: how transcription time grows with Utterance length (measure with a nonce, since Nan caches identical requests), and whether sending audio in chunks while the Owner speaks, and transcribing it in pieces, works well enough in Spanish (words split at chunk edges, lost context).
- The upload formats and size limits (webm/opus vs wav), and whether a smaller format is faster.

Do not change product code. Throwaway scripts only, kept with the findings.

## Answer

**No: Nan only transcribes a finished Utterance.** `GET /v1/models` lists one transcription model, `whisper` (large-v3, running on CPU). Every Realtime route returns 404, over HTTP and websocket. `stream=true` on `/audio/transcriptions` waits for the whole file and returns one body, and Nan's docs don't mention streaming.

**It barely matters, because a finished Utterance is already fast.**
- Every request has a fixed cost of about 1.3–2 s, mostly network and proxy, and each extra second of audio adds only about 0.02–0.03 s.
- 5 s of audio took 1.4–2.2 s and 75 s about 3 s, though one 76 s run took 4.4 s.
- webm/opus, which MediaRecorder already sends, is about 8× smaller than wav and faster from about 20 s up. Nothing needs to change there.

**Transcribing in pieces works in Spanish only when cut in pauses.**
- Cut in pauses: 3.1–3.5% word error rate, the same as one request.
- Blind 5 s or 10 s cuts: words break at the edges (3.5–4.4%), and a sentence cut short gets an invented ending.
- Blind cuts with the previous text as `prompt`: 24% error, and Whisper invented "Gracias por ver el video."
- It only saves about 1–2.5 s, and only for long monologues.
- MediaRecorder `timeslice` pieces can't be sent on their own, so pieces would need the recorder restarted at each pause, or encoding on the client.

**Limits:** Nan allows 10 Whisper requests a minute per key, and returns a 524 timeout for audio over about 2 minutes.

**Caveats:**
- The tests used Kokoro audio and few runs, and a busy Nan may be slower (its docs say "~1× realtime").
- "Jarvis" was transcribed as "Harviss" / "Harvis" in most runs, and `prompt: "Jarvis"` didn't fix it.

Findings: branch `research/hands-free-whisper-while-speaking`, file `.scratch/hands-free/research/whisper-while-speaking.md`, scripts in `whisper-while-speaking-scripts/`.
