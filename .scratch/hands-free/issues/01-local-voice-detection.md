# 01: Voice detection that runs locally in the browser and the Jarvis App

Type: research
Status: resolved
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

## Answer

**Recommendation:** Silero VAD `v6` through `@ricky0123/vad-web@0.0.31` (`MicVAD`), with every asset served from `apps/web/public/vad/` and no CDN. It is the only option that measurably rejects noise: on ESC-50 noise it is right 87% of the time, against 61% for v5 and 0% for WebRTC VAD. Its multi-domain ROC-AUC is 0.97, against 0.73 for WebRTC VAD. Silero is MIT, vad-web ISC, onnxruntime-web MIT.

**Cost:**
- **Download:** about 2.3 MB of model plus 14.2 MB of onnxruntime WASM, 3.7 MB gzipped.
- **CPU while waiting:** one inference per 32 ms frame, 0.19 ms natively. In browser WASM that is an estimated 1–3% of one core, unmeasured.

**Latency and knobs:**
- Speech start is caught in about 32 ms.
- Speech end waits `redemptionMs` (default 1400; try 600–900).
- `minSpeechMs` (default 400) drops clicks and coughs.
- `preSpeechPadMs` (default 800; try 300–500) keeps the first syllable.
- The thresholds default to 0.3 / 0.25.

**Where it runs:** an AudioWorklet cuts the frames, but inference runs on the main thread with `numThreads=1`, because the page isn't cross-origin isolated.

**Next.js and Electron:**
- Turbopack in Next 16.4 honours ORT's `webpackIgnore`.
- `stage-server.mjs` already copies `public/` into the Jarvis App.
- The Jarvis App loads over `http://`, not `file://`.
- There is no CSP today. One added later needs `'wasm-unsafe-eval'`.

**Rejected:**
- An energy threshold can't tell a voice from a keyboard or a TV, so it only drives the Orb's level animation, never the gate.
- WebRTC VAD lets noise through and has no maintained browser build.

**Spanish:** no published Spanish benchmark exists for any of them; Silero says it was trained on more than 6,000 languages. The real Spanish risk is mid-thought pauses ("eh…", "este…"), which is tuning, not the choice of model.

Still to check by feel:
- Idle CPU and memory in the hidden Jarvis window.
- First-load time on the Jarvis page.
- False triggers from a keyboard, a fan, music and Spanish TV, at thresholds 0.3 and 0.5.
- The shortest `redemptionMs` that doesn't cut Spanish pauses in two (600, 800, 1000 ms).
- Whether a 300–500 ms pre-roll keeps "Oye" in "Oye, ¿qué hora es?".
- Whether Whisper invents text from the quiet tail of up to 1 s the VAD keeps at the end. If it does, trim the tail.

Findings: branch `research/hands-free-local-voice-detection`, file `.scratch/hands-free/research/local-voice-detection.md`.
