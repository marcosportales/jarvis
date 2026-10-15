---
status: accepted
---

# Hands-free conversation replaces Push-to-talk as the way to talk

Until now the Owner talked to Jarvis only by holding Push-to-talk, as decided in `.scratch/voice-mvp/spec.md`. Now the Owner taps the Orb, Space or the global key to turn Hands-free on, and from then on Jarvis notices on its own when the Owner starts and stops speaking, until the Owner taps again. Push-to-talk stays as a hold, for a noisy room or for speaking once without opening the mic. Hands-free is always off when Jarvis starts, and turning it off is the only mute. Voice detection is Silero VAD (v6, through `@ricky0123/vad-web`), running locally in the Jarvis page, so while the Owner is silent nothing reaches Whisper or the chat model. Speech goes to Whisper in pieces after about 500 ms of quiet, and the Turn is sent after about 1200 ms ("transcribe early, send late"). This supersedes the Push-to-talk-only decision in the voice-mvp spec.

## Considered options

- **A wake word ("Hey Jarvis…")**: nothing usable exists for a Spanish speaker. Porcupine's `jarvis` is English-only and needs an AccessKey with no personal plan. openWakeWord's `hey_jarvis` is Python-only and non-commercial. It returns as a follow-up once Jarvis speaks English, and adds to the toggle without replacing it.
- **Always listening, with no toggle**: the mic would open without the Owner acting, and the Owner could never tell it was closed.
- **WebRTC VAD or an energy threshold**: much cheaper, but it can't tell noise from speech (0 vs 0.87 on ESC-50), and noise must never reach Whisper.
- **A single fixed end-of-turn pause**: 600 ms cut the Owner's Spanish hesitations in two, while 1.4 s adds its whole length to every Turn. Two pauses hide the long one behind Whisper, at the cost of one Whisper call per piece against Nan's 10 a minute.

## Consequences

- The listener has to be the player. Chromium's echo cancellation only removes Reply audio that the same page plays. On the Jarvis page, the Owner's voice cuts a Reply short after about 500–600 ms of speech. The Jarvis App stays half duplex until its echo has been measured.
- In the Jarvis App, the mic and voice detection live in the Jarvis page in its hidden window, which survives close. The Floating Orb, not the system, shows the Owner that the mic is open.
- The global key from ADR 0009 now tells a tap (toggle Hands-free) from a hold (Push-to-talk). Both rely on the portal reporting press and release, so ADR 0009 stands.
