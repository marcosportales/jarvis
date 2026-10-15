# Research: Can the wake word "Jarvis" be detected locally?

Answers ticket `04-wake-word` of the hands-free map. Sources were read on 2026-10-15. Nothing here assumes a wake word will be used.

## Answer

Yes, technically. Two engines can run fully inside a Chromium renderer, and so inside Electron's renderer, on 16 kHz PCM from `getUserMedia` + an AudioWorklet, with no audio leaving the machine:

- **Picovoice Porcupine** (`@picovoice/porcupine-web`, WASM in a Web Worker) ships a ready-made English `jarvis` keyword.
- **openWakeWord** ships a `hey_jarvis` model, but only for Python. A browser version would mean porting its three-stage ONNX pipeline to onnxruntime-web ourselves.

Neither is a good fit as is:

- **No published Spanish "Jarvis".** Every off-the-shelf "Jarvis" model is English-only, trained on English voices (or English TTS), and none publishes error rates for a Spanish speaker. Porcupine does have a Spanish language model, and a Spanish-trained "Jarvis" keyword might be possible, but that is unverified.
- **Porcupine's terms don't fit a personal project.** It needs an AccessKey, appears to contact Picovoice's servers when the engine starts (it has dedicated "activation" errors), and Picovoice says it has no free or paid plan for personal use, only a one-time enterprise Free Trial.
- **openWakeWord's models can't be shipped freely.** Its pretrained models are CC BY-NC-SA. Its "hey jarvis" model reports no error rates, and its docs warn that it can trigger in continuous speech.

The words after "Jarvis" can stay in the Utterance with any of these engines. This is not something the engine does; we would build it: keep the mic stream flowing through a short ring buffer and start the Utterance at (or just before) the detection frame.

## Options

### 1. Picovoice Porcupine (Web SDK)

| Question | Finding | Source |
|---|---|---|
| Is "Jarvis" available? | Yes. A built-in `jarvis_wasm.ppn` (English) is in `resources/keyword_files/wasm`. The Spanish built-ins are `emparedado`, `leopardo`, `manzana` and `murciélago`, with no "jarvis". | [porcupine/resources/keyword_files/wasm](https://github.com/Picovoice/porcupine/tree/master/resources/keyword_files/wasm), [keyword_files_es](https://github.com/Picovoice/porcupine/tree/master/resources/keyword_files_es) |
| Spanish | Porcupine supports Spanish through a separate `.pv` model file: "In order to detect non-English wake words you need to use the corresponding model file". Custom keywords are trained per language in the Console or via the Model API. Whether the Console accepts "Jarvis" as a Spanish phrase, and how it would pronounce it, is **unverified**. | [binding/web README](https://github.com/Picovoice/porcupine/blob/master/binding/web/README.md) |
| Accents | Its FAQ says it "works well across accents. However, it's impossible to quantify it", and recommends testing your own accented data during the trial. | [Porcupine FAQ](https://picovoice.ai/docs/faq/porcupine/) |
| False accepts and false rejects | Vendor claim: "97%+ accuracy (detection rate) with less than 1 false alarm in 10 hours in the presence of background speech and ambient noise." The benchmark keywords include `jarvis`, recorded by more than 50 crowd-sourced speakers, with LibriSpeech (English) speech and DEMAND noise mixed in at 10 dB SNR. That says nothing about Spanish speech around the keyword. | [Porcupine FAQ](https://picovoice.ai/docs/faq/porcupine/), [wake-word-benchmark](https://github.com/Picovoice/wake-word-benchmark) |
| CPU while waiting | Vendor claim: "about 1 MB of memory and less than 4% of a single core on a Raspberry Pi 3." On a desktop CPU, as WASM in a worker, it should be negligible (an inference, not measured). | [Porcupine FAQ](https://picovoice.ai/docs/faq/porcupine/) |
| Pause needed before "Jarvis"? | "By default, no." | [Porcupine FAQ](https://picovoice.ai/docs/faq/porcupine/) |
| Runs offline? Does audio leave the machine? | Inference runs on-device ("private and offline", WASM in a Web Worker, model cached in IndexedDB). The engine does phone home at startup, though. The Web binding defines `PorcupineActivationError`, `...ActivationLimitReachedError`, `...ActivationThrottledError` and `...ActivationRefusedError`, so creating an instance validates the AccessKey with Picovoice. That is a network dependency and a usage meter, not audio upload. | [binding/web README](https://github.com/Picovoice/porcupine/blob/master/binding/web/README.md), [porcupine_errors.ts](https://github.com/Picovoice/porcupine/blob/master/binding/web/src/porcupine_errors.ts) |
| License and cost | The SDK code is Apache-2.0, but "models and inference engines are proprietary". Usage is metered by monthly active users, where each browser instance that starts the engine counts as one. Picovoice says it "is a B2B company… there are no dedicated free or paid plans for personal or non-commercial use". The Free Trial is "a one-time offer" and "doesn't renew automatically". | [Picovoice general FAQ](https://picovoice.ai/docs/faq/general/), [LICENSE](https://github.com/Picovoice/porcupine/blob/master/LICENSE) |
| Electron | Runs in the renderer like any Chromium page. `@picovoice/porcupine-node` exists for Node (the main process). Electron itself is not mentioned in the docs. | [Porcupine README](https://github.com/Picovoice/porcupine) |

### 2. openWakeWord (ONNX / TFLite)

| Question | Finding | Source |
|---|---|---|
| Is "Jarvis" available? | Yes, as `hey_jarvis`. Its docs say "'jarvis' alone may work but likely with higher false-reject rates". It was trained on about 200k synthetic clips from two English multi-speaker TTS models (LibriTTS, VCTK), against about 31k hours of negative audio that includes multilingual Common Voice 11. | [docs/models/hey_jarvis.md](https://github.com/dscripka/openWakeWord/blob/main/docs/models/hey_jarvis.md) |
| Spanish | "openWakeWord only supports English", because the training TTS is English. The model was tested by "a male speaker with a neutral American English accent". | [README](https://github.com/dscripka/openWakeWord#language-support) |
| False accepts and false rejects | The project targets fewer than 0.5 false accepts per hour and under 5% false rejects in general. For `hey_jarvis` specifically, there is "no test set available" and no numbers are given. Its stated limits: "may sometimes trigger during continuous speech", "a short pause after the wake phrase is recommended", and speech or music playing on the same device raises false rejects without echo cancellation. | [README](https://github.com/dscripka/openWakeWord), [hey_jarvis.md](https://github.com/dscripka/openWakeWord/blob/main/docs/models/hey_jarvis.md) |
| CPU | "A single core of a Raspberry Pi 3 can run 15-20 openWakeWord models simultaneously in real-time." Audio goes in 80 ms frames at 16 kHz. The pipeline is a mel spectrogram, then a shared Google speech-embedding backbone, then a small classifier. | [README](https://github.com/dscripka/openWakeWord) |
| Browser and Electron | No official JS. ONNX Runtime has a JS build, but "much of the other functionality … would need to be ported. This is not currently on the roadmap." The official web example streams browser audio over a websocket to a Python process. For us that would mean a local Python sidecar (Electron only) or our own onnxruntime-web port. | [README FAQ](https://github.com/dscripka/openWakeWord#faq) |
| VAD | A bundled Silero VAD can gate detections (`vad_threshold`), allowing a positive only while VAD says speech. | [README](https://github.com/dscripka/openWakeWord#noise-suppression-and-voice-activity-detection-vad) |
| Custom "Jarvis" | Can be trained from synthetic TTS in Colab in under an hour, ideally from several thousand examples. A Spanish-accented "Jarvis" would need a Spanish TTS to generate them. A **custom verifier model** trained on the Owner's own voice can filter false activations. | [README](https://github.com/dscripka/openWakeWord) |
| License | The code is Apache-2.0. The pretrained models are **CC BY-NC-SA 4.0**. A model we train ourselves is unencumbered by that, apart from whatever license its training data carries. | [README § License](https://github.com/dscripka/openWakeWord#license) |

### 3. Other options

- **microWakeWord** (TFLite Micro, built for ESP32). ESPHome publishes a `hey_jarvis.tflite` (`"trained_languages": ["en"]`, `probability_cutoff: 0.97`) under Apache-2.0. Unlike openWakeWord's models, its license allows redistribution. It targets TFLite Micro, though, and there is no browser runtime. Running it in a renderer would need a TFLite WASM port. Sources: [micro-wake-word-models/models/v2](https://github.com/esphome/micro-wake-word-models/tree/main/models/v2), [microWakeWord](https://github.com/kahrendt/microWakeWord).
- **sherpa-onnx keyword spotting** (Apache-2.0, has WebAssembly KWS builds under `wasm/kws`). It is open-vocabulary: keywords are written as tokens or phonemes, so "Jarvis" needs no training. Its pretrained KWS models cover only English and Chinese, at about 19–38 MB, and it publishes **no false-alarm numbers**. Sources: [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx), [KWS pretrained models](https://k2-fsa.github.io/sherpa/onnx/kws/pretrained_models/index.html).
- **Vosk with a restricted grammar** (`vosk-browser`, WASM in a worker). `KaldiRecognizer(sampleRate, grammar?)` accepts a word list. `vosk-model-small-es-0.42` is 39 MB, Spanish and Apache-2.0. This is the only option here whose acoustic model is Spanish. The caveat, **unverified**: "jarvis" is probably not in the Spanish lexicon, so the grammar might need a Spanish-spelled stand-in. It is also a full recognizer, so it would cost far more CPU than a wake-word model. Sources: [vosk-browser model.ts](https://github.com/ccoreilly/vosk-browser/blob/master/lib/src/model.ts), [Vosk models](https://alphacephei.com/vosk/models).
- **Silero VAD + a local transcriber, then match "Jarvis" in text.** VAD finds speech, a local Spanish-capable recognizer transcribes each segment (for example Whisper in WASM or WebGPU), and the text is checked for an opening "Jarvis". This handles Spanish and the Utterance stays intact by construction, but it costs a transcription per speech segment, which goes against the map's "almost free while silent" goal whenever the room is talking. No primary benchmark was found for this.
- **Web Speech API with `processLocally`.** The spec has `processLocally` so that recognition never leaves the device, and Chrome filed an Intent to Ship (estimated M135). Edge documents local `es-ES`. Electron does not ship Google's speech service, and whether it supports the on-device path is **unverified**. Sources: [MDN processLocally](https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally), [blink-dev Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM/m/TQpe9shjCgAJ).
- **Ruled out:** default `webkitSpeechRecognition` sends audio to a server ([MDN](https://developer.mozilla.org/docs/Web/API/SpeechRecognition)), which breaks "no audio anywhere".

## The Spanish-speaker problem

- **Pronunciation.** English "Jarvis" begins with /dʒ/. A Spanish speaker may say [ˈxaɾβis] (Spanish *j*), [ˈʝaɾβis] or an anglicised /dʒ/, with a tapped *r* and no vowel reduction. The English models were trained on English voices or English TTS. This reading is based on how the models were trained; none of the sources measures it.
- **Spanish speech around the keyword.** Porcupine's benchmark uses English background speech (LibriSpeech). openWakeWord's negatives include multilingual Common Voice but it publishes no `hey_jarvis` rates. So **nobody publishes false accepts per hour for Spanish conversation**. We would have to measure it with the Owner's voice and a few hours of Spanish TV or podcasts.
- **Ways to reduce the risk:**
  - Porcupine trained on its Spanish `.pv` model. Licensing still applies.
  - openWakeWord retrained on Spanish-TTS "Jarvis" plus an Owner-voice verifier.
  - Vosk Spanish with a grammar.

## Composing with voice detection (Silero VAD)

- **One stream, two models.** Silero VAD (MIT, "no telemetry, no keys"; under 1 ms per 30+ ms chunk on one CPU thread) and the wake-word engine can share one AudioWorklet that resamples to 16 kHz mono:
  - Silero takes 512-sample frames.
  - Porcupine takes its own `frameLength`, read from the engine.
  - openWakeWord takes 80 ms (1280-sample) frames.

  Source: [silero-vad README](https://github.com/snakers4/silero-vad).
- **Gating order.** There are three options:
  - Run the wake word continuously. It is cheap (under 4% of a Pi 3 core for Porcupine), and VAD then only decides where the Utterance ends.
  - Run the wake word only while VAD says speech. This needs a pre-roll buffer of about 0.5–1 s so the first syllable isn't lost.
  - Require both (openWakeWord's `vad_threshold`), which cuts false accepts from non-speech noise.

  A wake word doesn't replace VAD: something still has to detect when the Owner stops speaking.
- **Keeping "Jarvis, ¿qué hora es?" as one Utterance.**
  - Detection fires near the end of the keyword. Porcupine doesn't require a pause before it; openWakeWord's `hey_jarvis` recommends a short pause *after* it.
  - If capture is continuous (ring buffer → Utterance buffer from the detection frame minus the keyword length), the words that follow in the same breath are kept. VAD then closes the Utterance at the end-of-turn pause.
  - Whether "Jarvis" itself is cut out or left in for Whisper is our choice. Leaving it in is harmless and makes the Transcript read naturally.
- **Hard limits.**
  - Limit 1 (silence never reaches Whisper): met, since nothing is sent until detection and VAD.
  - Limit 2 (no self-hearing): the wake word does **not** solve it. Jarvis's own Reply could contain "Jarvis", and openWakeWord notes that playback on the same device needs echo cancellation. `getUserMedia({ audio: { echoCancellation: true } })` or pausing detection while Speaking is still required.
  - Limit 3 (the Owner can tell the mic is open): the mic *is* open while waiting for the wake word, even though nothing leaves the device. The privacy ticket has to settle what "open" means to the Owner.
- **Electron with the window closed.** The renderer engines need a live renderer: a hidden window or an offscreen document. Otherwise it needs the Node bindings (Porcupine has `porcupine-node`; openWakeWord would need a Python sidecar) in the main process with native capture. This is an architecture question for the "window closed" ticket.

## Open items

1. **Spanish "Jarvis" in Porcupine.** Does the Picovoice Console accept "Jarvis" as a Spanish phrase, and does the trial key allow it? And would the Owner accept Picovoice's licence: an AccessKey, startup activation, and no personal plan?
2. **No Spanish-context numbers exist for any engine.** If a wake word is chosen, a small prototype has to measure:
   - false rejects for the Owner saying "Jarvis…"
   - false accepts per hour over Spanish TV, podcasts and conversation
   - false accepts from Jarvis's own Kokoro voice
3. **openWakeWord in the browser** would need a port of three ONNX models (melspec, embedding, classifier) to onnxruntime-web. Community ports exist but were not evaluated; they are not primary sources.
4. **Vosk Spanish grammar with "jarvis".** Is the word in the lexicon, or does a Spanish spelling such as "yarvis" match better? Untested.
5. **The on-device Web Speech API** (`processLocally`, Spanish): whether it ships in Chrome stable and works in Electron is unverified.
6. **Licensing for a self-trained model.** A model trained by us (openWakeWord or microWakeWord pipeline) avoids CC BY-NC-SA, but its training data licenses would need checking.
