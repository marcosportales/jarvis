# 01: Voice detection that runs locally in the browser and the Jarvis App

Type: research
Status: open
Blocked by: none
Findings: branch `research/hands-free-local-voice-detection`, file `.scratch/hands-free/research/local-voice-detection.md`

## Question

Which voice activity detection can run on the Owner's own machine, in a Chromium renderer (the Jarvis page) and in Electron (the Jarvis App), to tell when the Owner starts and stops speaking, without sending silence or noise anywhere?

Cover at least Silero VAD (ONNX, through onnxruntime-web or `@ricky0123/vad-web`), the WebRTC VAD, and a plain energy threshold as the baseline. For each:
- CPU cost while waiting with the mic open (the idle-listening budget), plus memory and download size.
- Latency to detect speech start and speech end, and the knobs (frame size, thresholds, minimum speech, pre-roll padding so the first syllable isn't lost).
- Accuracy for Spanish speech and robustness to keyboard, fan, music and TV noise. Note what evidence exists, since most benchmarks are English.
- Whether it runs in an AudioWorklet or Web Worker, and any constraints from Next.js (serving the WASM and ONNX assets) or Electron (CSP, `file://`).
- License.

End with a recommendation and what still has to be checked by feel.
