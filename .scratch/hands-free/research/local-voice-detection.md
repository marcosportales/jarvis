# Research: voice detection that runs locally (ticket 01)

Question (from `.scratch/hands-free/issues/01-local-voice-detection.md`): which voice activity detection (VAD) can run on the Owner's machine, in the Jarvis page (Chromium) and the Jarvis App (Electron), to tell when the Owner starts and stops speaking, without sending silence or noise anywhere?

Researched 2026-10-15 against the sources listed at the end. Package facts come from the published tarballs `@ricky0123/vad-web@0.0.31` and `onnxruntime-web@1.30.0` (read, not run). Anything marked **estimate** has no primary source and has to be measured.

## Answer

Use **Silero VAD, model `v6`, through `@ricky0123/vad-web`** (`MicVAD`). Serve its worklet, model and onnxruntime-web WASM from `apps/web/public/` so nothing loads from a CDN. It is the only one of the three candidates with published evidence that it rejects noise. On ESC-50 environmental noise, WebRTC VAD scores 0 accuracy (it calls all of it speech), Silero v5 scores 0.61 and Silero v6 scores 0.87 [S2]. It also leads on every speech set.

The cost is about 2.3 MB for the model and 14.2 MB for the WASM (3.7 MB gzipped) the first time it loads. After that it runs one inference per 32 ms frame. Native, one frame takes about 0.19 ms on one thread [S3], so idle listening should cost low single-digit percent of one core in WASM. That figure is an **estimate** that has to be measured.

Keep a plain energy threshold only as a level meter for the Orb, never as the gate. WebRTC VAD isn't worth it in the browser: it has no maintained web build and it lets noise through.

## Candidates compared

| | Silero VAD v6 via `@ricky0123/vad-web` | WebRTC VAD (libfvad → WASM) | Energy threshold (RMS) |
|---|---|---|---|
| What it is | Small neural net (ONNX), speech probability per 32 ms frame [S1][S4] | GMM on sub-band energies, from WebRTC's `common_audio/vad` [S6][S7] | Loudness over a fixed or adaptive floor |
| Frame / rate | 512 samples at 16 kHz = 32 ms; input is resampled to 16 kHz in the worklet [S4][T1] | 10/20/30 ms at 8/16/32 kHz [S7] | Any; the AudioWorklet delivers 128-sample render quanta |
| Download | `silero_vad_v6.onnx` 2,327,524 B (1.94 MB gzip). `ort-wasm-simd-threaded.wasm` 14,239,897 B (3.66 MB gzip, 2.30 MB brotli) plus its `.mjs` 24 KB. Worklet 2.5 KB. `vad-web` bundle about 69 KB [T1][T2] | A WASM build of libfvad, tens of KB (**estimate**) | 0 |
| CPU while waiting | 31.25 inferences/s. Native ONNX takes 189 µs per chunk on one thread (Threadripper 3960X) [S3], about 0.6 % of a core. WASM single-threaded is slower: **estimate** 1–3 % of a core, to measure | Negligible | Negligible |
| Memory | ORT WASM heap plus the model. **Estimate** tens of MB; to measure | Tiny | Tiny |
| Speech-start latency | `onSpeechStart` fires on the first frame whose probability is at least `positiveSpeechThreshold`, so about 32 ms plus inference. `onSpeechRealStart` fires once `minSpeechMs` of speech frames is reached [T1][S5] | 10–30 ms | One render quantum, but jumpy |
| Speech-end latency | `redemptionMs` of frames below `negativeSpeechThreshold` (default 1400 ms) [S4][T1] | Needs its own hangover logic | Needs its own hangover logic |
| Noise robustness | Best of the three. ESC-50 noise accuracy 0.87 (v5: 0.61). Private noisy-call noise 0.71 (v5: 0.44). Multi-domain speech ROC-AUC 0.97 [S2] | Poor. ESC-50 accuracy 0, private noise 0.15, multi-domain ROC-AUC 0.73 [S2] | Worst: a keyboard, TV or music above the floor all count as speech. Chromium's default `autoGainControl` moves levels around, so fixed thresholds drift |
| Spanish | Trained on "over 6000 languages" [S1]. No Spanish-specific published numbers found | Language-agnostic signal model; no Spanish numbers | Language-agnostic |
| Where it runs | AudioWorklet (audio thread) resamples and slices frames, then `postMessage`s them. **Inference runs on the main thread** in ORT WASM (`processFrame` on `port.onmessage`) [T1]. Falls back to ScriptProcessor without AudioWorklet [S5] | Could run inside the AudioWorklet itself | AudioWorklet or AnalyserNode |
| License | Silero model MIT [S8]. `vad-web` ISC [T1]. onnxruntime-web MIT [T2] | BSD-3-Clause [S6] | n/a |
| Maintenance | `vad-web` 0.0.31 published 2026-09; ships legacy, v5 and v6 models [T1] | The only web port found (`@ozymandiasthegreat/vad`, libfvad-wasm) shows no downloads; nothing maintained | n/a |

### Why not WebRTC VAD

On Silero's published benchmark, WebRTC VAD classified 0 % of ESC-50 environmental-noise clips correctly and 15 % of noisy-call noise [S2]. That breaks hard limit 1 directly: noise would reach Whisper. Its advantage is CPU, but Silero's CPU cost is already small, and there's no maintained browser build to adopt.

### Why not the energy threshold as the gate

An energy threshold can't tell a voice from a keyboard, a fan surge, music or TV. Chromium also applies `autoGainControl` and `noiseSuppression` by default (vad-web asks for both [T1]), so a level fixed today isn't the level tomorrow. It is still the right thing to drive the Orb's level animation, and it could later sit in front of Silero as a "nothing is louder than the floor, skip inference" pre-gate if measurements show idle CPU matters. The pre-roll buffer would cover the onset. Don't build that until it's measured.

## The knobs (vad-web `MicVAD`)

Defaults from `frame-processor.js` and the docs [T1][S4][S5]:

| Option | Default | What it does | Starting point for Jarvis |
|---|---|---|---|
| `model` | `"legacy"` | `"legacy"` (1536-sample, 96 ms frames), `"v5"`, `"v6"` (512-sample, 32 ms) | **`"v6"`**, for noise rejection |
| `positiveSpeechThreshold` | 0.3 | Probability at which a frame counts as speech | 0.5 (Silero's own default) if TV or music trigger it; tune by feel |
| `negativeSpeechThreshold` | 0.25 | Below this, a frame counts toward ending the segment. Values between the two thresholds are ignored | About 0.15 below positive |
| `redemptionMs` | 1400 | Silence needed before `onSpeechEnd`; **sets the end-of-Utterance delay** | 600–900 ms to try; Spanish mid-sentence pauses decide it (see "by feel") |
| `minSpeechMs` | 400 | Segments with fewer speech frames than this become `onVADMisfire` (coughs, clicks, "eh") | 250–400 |
| `preSpeechPadMs` | 800 | Pre-roll put before the first speech frame so the first syllable isn't lost | 300–500 |
| `getStream` / `pauseStream` / `resumeStream` | `getUserMedia` mono with `echoCancellation`, `autoGainControl` and `noiseSuppression` true; pausing stops the tracks | Mic lifecycle. Stopping the tracks on pause is what turns off the OS mic indicator | Keep the defaults; echo cancellation also matters for hard limit 2 (a separate ticket) |
| `processorType` | `"auto"` | AudioWorklet, falling back to ScriptProcessor | auto |
| `submitUserSpeechOnPause` | false | Whether `pause()` emits the segment in progress | false |
| `baseAssetPath` / `onnxWASMBasePath` | `"./"` in code (the docs say a CDN) | Where the worklet, `.onnx`, `.wasm` and `.mjs` load from | An absolute local path such as `/vad/` |
| `ortConfig` | sets `logLevel` to "error" | Hook to configure ORT, e.g. `ort.env.wasm.numThreads = 1` | Set `numThreads = 1` explicitly |

`onSpeechEnd(audio)` hands over a `Float32Array` of 16 kHz samples in [-1, 1] [S5]. `utils.encodeWAV` turns it into a WAV for `/api/transcribe` [T1]. The segment carries the pre-roll and the trailing `redemptionMs` of quiet frames [T1], so at most about 1 s of near-silence reaches Whisper in each Utterance. Trim the tail if Whisper hallucinates on it. The VAD replaces `MediaRecorder` in `apps/web/lib/jarvis/browser-adapters.ts`: the Recorder no longer decides when to stop; the VAD does.

## Serving the assets: Next.js 16.4 and Electron 44

- **Where they live.** Copy `vad.worklet.bundle.min.js`, `silero_vad_v6.onnx`, `ort-wasm-simd-threaded.wasm` and `ort-wasm-simd-threaded.mjs` into `apps/web/public/vad/`. vad-web's docs give copy-plugin recipes for webpack and Vite, but nothing for Next.js [S4]; a `postinstall` copy or committed files both work. Next serves `public/` at `/` [N1]. Files there get `Cache-Control: public, max-age=0`, so they are revalidated on each load, not re-downloaded [N1]. They are gzipped by the Next server (`compress` defaults on) [N3].
- **Standalone and the Jarvis App.** `output: "standalone"` doesn't copy `public/` [N2], but `apps/desktop/scripts/stage-server.mjs` already copies it next to `server.js`. The Jarvis App loads its pages from that local server over `http://` with `loadURL` (`apps/desktop/src/main.ts`), not `file://`, so the `file://` and custom-protocol problems don't arise. The page is on localhost, which is a secure context, as AudioWorklet and `getUserMedia` require [M1].
- **Bundling ORT under Turbopack.** vad-web `require`s `onnxruntime-web/wasm` (`ort.wasm.min.js`, about 50 KB). At runtime ORT loads its `.wasm` and `.mjs` from `env.wasm.wasmPaths` with `import(/*webpackIgnore:true*/ …)` [T2]. Next 16's Turbopack honours `webpackIgnore: true` ("Skip bundling, preserve import") [N4]. The `.wasm` and `.mjs` must come from the same ORT build as the JS [S9], so pin `onnxruntime-web` and copy from that exact version. Load `MicVAD` only on the client (dynamic import in a client component), never during SSR.
- **CSP.** The repo sets no Content-Security-Policy today (nothing in `next.config.ts`, and no proxy). If one is added, it needs `'wasm-unsafe-eval'` [N5]. ORT works under CSP since 1.19 [S9], but `env.wasm.proxy` (inference in a Blob-created worker) doesn't [S10].
- **Threads and workers.** ORT's default `numThreads` is min(cores/2, 4), but only with `crossOriginIsolated`; without it, ORT runs single-threaded [S10]. The Jarvis page isn't cross-origin isolated, and a 2 MB model doesn't need threads, so set `numThreads = 1`. Inference then runs on the main thread, about 31 calls/s of under 1 ms each. To move it off the main thread, run ORT in a dedicated Web Worker loaded from a real URL, not with `env.wasm.proxy`. That is only worth doing if the Orb's animation stutters.
- **Window closed and background.** The Jarvis App sets `backgroundThrottling: false` on both windows, and Electron's default `autoplayPolicy` is `no-user-gesture-required` [E1], so an `AudioContext` can start and keep running with the window hidden. On the plain Jarvis page in Chrome, an `AudioContext` needs a user gesture to start, and background-tab behaviour is the open map item ("The Jarvis page in a background tab").

## Spanish: what the evidence is

- Silero says it was trained on "over 6000 languages" and "performs well on audios from different domains with various background noise" [S1]. Its quality wiki [S2] uses AliMeeting and AISHELL-4 (Mandarin), Earnings-21 (English calls), MSDWild, VoxConverse and LibriParty (multilingual or English) and ESC-50 (noise). **None of it is Spanish.**
- No published Spanish VAD benchmark was found for Silero or WebRTC. Picovoice's VAD benchmark is LibriSpeech (English) with DEMAND noise [S11], and it is vendor-run.
- VAD works on acoustics, not words, so a multilingual model should carry over. Spanish has many short open syllables, which helps detection. The real Spanish-specific risk is **end-of-turn**: pauses mid-thought ("eh…", "este…") versus `redemptionMs`. That is tuning, not model choice.

## Check by feel

1. **Idle CPU and memory** in the Jarvis App with the window hidden (Chromium task manager): Silero v6 at `numThreads = 1`. Expect low single-digit percent of one core; if it's higher, try an energy pre-gate.
2. **First-load time** on the Jarvis page (about 16 MB raw, 5.6 MB gzipped) and the second load with revalidation.
3. **False triggers** from a mechanical keyboard, a laptop fan, music and a Spanish TV or YouTube talk show at room volume, at `positiveSpeechThreshold` 0.3 versus 0.5. TV speech *will* trigger any VAD. That belongs to the "Other voices in the room" item, not this one.
4. **`redemptionMs`** for the Owner's Spanish: the shortest value that doesn't cut "quiero que… eh… me pongas una alarma" in two. Try 600, 800 and 1000 ms.
5. **First syllable**: with `preSpeechPadMs` at 300–500, does Whisper still get the first word of a quick "Oye, ¿qué hora es?"?
6. **Trailing silence**: does Whisper invent text from the about-1 s quiet tail? If so, trim it before upload.
7. **Echo**: with Jarvis Speaking through the speakers, does Chromium's echo cancellation keep Silero from firing (hard limit 2, a separate ticket)?

## Sources

Primary, fetched 2026-10-15:

- [S1] Silero VAD README: https://github.com/snakers4/silero-vad (MIT; under 1 ms per 30+ ms chunk on one thread; 6000+ languages; 8/16 kHz)
- [S2] Silero VAD wiki, Quality Metrics: https://github.com/snakers4/silero-vad/wiki/Quality-Metrics
- [S3] Silero VAD wiki, Performance Metrics: https://github.com/snakers4/silero-vad/wiki/Performance-Metrics (V5 ONNX 189 µs per chunk, one thread, Threadripper 3960X)
- [S4] vad-web docs, algorithm and browser setup: https://docs.vad.ricky0123.com/user-guide/algorithm/ and https://docs.vad.ricky0123.com/user-guide/browser/
- [S5] vad-web docs, API: https://docs.vad.ricky0123.com/user-guide/api/
- [S6] libfvad (WebRTC VAD fork, BSD-3-Clause): https://github.com/dpirch/libfvad
- [S7] WebRTC `webrtc_vad.h`: https://webrtc.googlesource.com/src/+/refs/heads/main/common_audio/vad/include/webrtc_vad.h (modes 0–3; 10/20/30 ms; 8/16/32 kHz)
- [S8] Silero LICENSE: https://raw.githubusercontent.com/snakers4/silero-vad/master/LICENSE
- [S9] ONNX Runtime Web, deploy: https://onnxruntime.ai/docs/tutorials/web/deploy.html
- [S10] ONNX Runtime Web, env flags: https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html
- [S11] Picovoice VAD benchmark (vendor, English): https://picovoice.ai/docs/benchmark/vad/
- [M1] MDN, AudioWorklet (secure context; runs on the Web Audio thread): https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
- [E1] Electron `WebPreferences` (`autoplayPolicy`, `backgroundThrottling`): https://www.electronjs.org/docs/latest/api/structures/web-preferences
- [T1] npm tarball `@ricky0123/vad-web@0.0.31`: `dist/real-time-vad.js`, `dist/frame-processor.js`, `dist/worklet.js`, `dist/utils.js`, file sizes, `package.json` (ISC; depends on `onnxruntime-web ^1.17.0`)
- [T2] npm tarball `onnxruntime-web@1.30.0`: `dist/` file sizes, `package.json` exports, the `webpackIgnore` import in `ort.wasm.min.mjs` (MIT)
- [N1] Next 16.4 docs, `public` folder: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md`
- [N2] Next 16.4 docs, `output` (standalone doesn't copy `public`): `…/05-config/01-next-config-js/output.md`
- [N3] Next 16.4 docs, `compress`: `…/05-config/01-next-config-js/compress.md`
- [N4] Next 16.4 docs, Turbopack magic comments: `…/03-api-reference/08-turbopack.md`
- [N5] Next 16.4 docs, CSP guide (`'wasm-unsafe-eval'`): `…/01-app/02-guides/content-security-policy.md`

Repo facts: `apps/web/next.config.ts`, `apps/desktop/src/main.ts`, `apps/desktop/src/floating-orb-window.ts`, `apps/desktop/scripts/stage-server.mjs`, `apps/web/lib/jarvis/browser-adapters.ts`.
