# 02: Can Whisper on Nan transcribe while the Owner is still speaking?

Type: research
Status: open
Blocked by: none
Findings: branch `research/hands-free-whisper-while-speaking`, file `.scratch/hands-free/research/whisper-while-speaking.md`

## Question

Can transcription start before the Owner finishes, so the gap after the Owner stops shrinks to almost nothing? Or can Whisper on Nan (`api.nan.builders/v1`, OpenAI-compatible, `nanConfig.transcriptionModel`) only transcribe a finished Utterance?

Find out:
- Whether Nan offers a streaming or realtime transcription endpoint (an OpenAI Realtime-style websocket, `stream: true` on `/audio/transcriptions`, or similar), and which transcription models it lists.
- If not: how transcription time grows with Utterance length (measure with a nonce, since Nan caches identical requests), and whether sending audio in chunks while the Owner speaks, and transcribing it in pieces, works well enough in Spanish (words split at chunk edges, lost context).
- The upload formats and size limits (webm/opus vs wav), and whether a smaller format is faster.

Do not change product code. Throwaway scripts only, kept with the findings.
