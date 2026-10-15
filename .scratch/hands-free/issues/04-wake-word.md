# 04: Can a wake word ("Jarvis…") be detected locally?

Type: research
Status: resolved
Blocked by: none
Findings: branch `research/hands-free-wake-word`, file `.scratch/hands-free/research/wake-word.md`

## Question

If the Owner opened each conversation by saying "Jarvis…", could that word be detected locally in the browser and in Electron, without sending audio anywhere until it is heard?

Cover openWakeWord (ONNX), Picovoice Porcupine (Web SDK) and any other credible option:
- Whether "Jarvis" is available or trainable, and how it performs with a Spanish speaker and Spanish sentences around it.
- CPU cost while waiting, false accepts per hour, false rejects.
- Licensing and cost (Porcupine needs an access key and has usage terms), and whether it runs offline.
- How it fits with voice detection: one model or two, and whether the words after "Jarvis" in the same breath can stay part of the Utterance.

This only informs a choice; it does not assume a wake word will be used.

## Answer

Yes, "Jarvis" can be detected locally in a Chromium or Electron renderer. Neither ready-made option fits as is:
- **Porcupine** (`@picovoice/porcupine-web`, WebAssembly in a Worker) has a built-in English `jarvis` keyword. The vendor claims under 4% of one Raspberry Pi 3 core and 97%+ detection at fewer than 1 false alarm per 10 hours, measured on English. It needs an AccessKey, apparently checked online when the engine starts, and Picovoice has no personal or non-commercial plan, only a one-time enterprise trial.
- **openWakeWord** has `hey_jarvis`, but it is English-only, Python-only (the browser would need a port of its ONNX pipeline), and its models are CC BY-NC-SA. It publishes no error rates for `hey_jarvis` and warns it can trigger during continuous speech.

The other options each fall short somewhere:
- **Vosk** with a Spanish model and a restricted word list: Spanish and Apache-2.0, but heavy on CPU, and untested with "jarvis".
- **sherpa-onnx keyword spotting:** open vocabulary, but English/Chinese models only.
- **microWakeWord:** English, with no browser runtime.
- **Silero VAD plus a local transcriber:** handles Spanish, but transcribes all speech in the room.
- **Chrome's on-device recognition:** not confirmed shipped, and Electron support is unknown.

No engine publishes false-accept or false-reject rates for a Spanish speaker, and the Owner may say "Jarvis" with a Spanish *j*.

The wake word sits alongside voice detection, not instead of it: the wake word opens the Utterance and voice detection still decides when it ends. Words right after "Jarvis" stay in the Utterance only if the mic feeds a short rolling buffer and the Utterance starts at the detection point. A wake word doesn't stop Jarvis hearing itself either.

Still to check:
- Can Picovoice train a Spanish "Jarvis", and are its terms acceptable?
- Measured false rejects and false accepts per hour over Spanish TV and conversation, and over Jarvis's own Kokoro voice.
- Community onnxruntime-web ports of openWakeWord.
- "jarvis" or "yarvis" in Vosk's Spanish vocabulary.

Findings: branch `research/hands-free-wake-word`, file `.scratch/hands-free/research/wake-word.md`.
