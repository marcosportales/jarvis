# Map: Hands-free conversation

Label: wayfinder:map

## Destination

A spec at `.scratch/hands-free/spec.md`, ready for `/to-spec`, that replaces Push-to-talk with hands-free conversation: Jarvis notices on its own when the Owner starts and stops speaking, waits quietly and almost for free while the Owner is silent, and answers with person-like timing, on the Jarvis page and in the Jarvis App, including with its window closed.

## Notes

- **Domain:** use `CONTEXT.md` vocabulary (Owner, Utterance, Turn, Reply, Jarvis State, Orb, Floating Orb, Jarvis App, Caption, Jarvis Health). Utterance, Listening, Push-to-talk and Speaking are defined in terms of Push-to-talk today. Until **Domain: Utterance, Listening, Push-to-talk and a waiting Jarvis State** resolves, treat those definitions as up for change, not as constraints.
- **Hard limits:** every ticket answers to these.
  1. Silence and background noise never reach Whisper or the chat model.
  2. Jarvis never hears its own voice as an Utterance.
  3. The Owner can always tell whether the mic is open.
- **Wanted:** no transcription or model calls while the Owner is silent; the gap from the Owner finishing to Jarvis starting to answer as short as possible; works on the Jarvis page and in the Jarvis App, including with its window closed.
- **Skills:** grilling tickets call `grilling` + `domain-modeling`; prototype tickets call `prototype`; research tickets are resolved by a subagent that calls `research` and commits its findings to a throwaway `research/hands-free-<slug>` branch, pointed at from the ticket.
- **Where things are today:** capture is `getUserMedia({ audio: true })` + `MediaRecorder` in `apps/web/lib/jarvis/browser-adapters.ts`; the Reply plays through a plain `new Audio(blob)` from `/api/speech` (Kokoro, not streamed); `/api/transcribe` sends one blob to Nan's Whisper (`language: "es"`); holds are arbitrated in `apps/web/lib/jarvis/push-to-talk.ts`; the global key comes through the XDG portal (`apps/desktop/src/portal-shortcuts.ts`, ADR 0009). Push-to-talk itself has no ADR; it was decided in `.scratch/voice-mvp/spec.md`.
- **Benchmarking Nan:** Nan caches identical requests; put a random nonce in every timed request.

## Decisions so far

<!-- one line per closed ticket: [title](issues/NN-slug.md): gist -->

- [Can the Jarvis App keep listening with its window closed?](issues/05-mic-with-window-closed.md): Yes. The mic and voice detection live in the Jarvis page in the hidden Jarvis window, which already survives close, unthrottled and with the mic granted. The shell tells the page when it's hidden, and the Floating Orb shows the mic is open, because Hyprland and Caelestia show nothing.
- [Can a wake word ("Jarvis…") be detected locally?](issues/04-wake-word.md): Possible but nothing is ready to use. Porcupine has an English `jarvis` in the browser, but behind an AccessKey with no personal plan. openWakeWord's `hey_jarvis` is Python-only and non-commercial. There are no Spanish error rates, and voice detection is still needed to end the Utterance.
- [Voice detection that runs locally in the browser and the Jarvis App](issues/01-local-voice-detection.md): Silero VAD v6 through `@ricky0123/vad-web`, self-hosted in `public/vad/`. About 3.7 MB gzipped and an estimated 1–3% of a core while waiting. It rejects noise far better than WebRTC VAD (0.87 vs 0 on ESC-50). The energy level only drives the Orb, never the gate.
- [Echo cancellation so Jarvis doesn't hear its own Reply](issues/03-echo-cancellation.md): Chromium/Electron echo cancellation on Linux already cancels any Reply audio the same app plays, but not other apps' audio and not with zero leftover echo, so the listener must be the player. Use it plus a stricter detection gate while Speaking, with half duplex as the fallback. PipeWire's echo-cancel is an opt-in extra.
- [Can Whisper on Nan transcribe while the Owner is still speaking?](issues/02-whisper-while-speaking.md): No streaming on Nan, but a finished Utterance takes about 1.5–3 s whatever its length, so transcribe once the Owner stops. Pieces cut in pauses only pay off for long monologues. Nan allows 10 Whisper requests a minute and drops audio over about 2 minutes.
- [How a conversation opens: always listening, a wake word, or a toggle?](issues/07-how-a-conversation-opens.md): A toggle. While it's on, every stretch of speech becomes an Utterance, and it stays on until the Owner turns it off. A tap on the Orb, Space or the global key toggles; a hold is still Push-to-talk. The same on the Jarvis page and in the Jarvis App.
- [Measure where the gap goes between the Owner finishing and Jarvis speaking](issues/06-where-the-gap-goes.md): 7–15 s today, mostly fixed costs. Each Nan chat call costs about 2–3 s whatever the prompt size, and a tool Turn makes three. Composio Plugin setup adds 2–2.5 s to every Turn. Whisper takes 1–2.5 s and Kokoro 1–1.7 s. Streaming the Reply would save at most 1–2 s, and only on long Replies.

## Not yet specified

- **Other voices in the room.** A TV, a call, or someone else talking will look like speech. The opening mode is a toggle with no wake word, so the Owner's defence is turning hands-free off. Still open: whether that's enough, or whether Jarvis needs something more (telling the Owner's voice apart, or backing off when it keeps hearing speech that isn't meant for it). Every false trigger also spends one of Nan's 10 Whisper requests a minute.
- **Failure and Jarvis Health.** What happens when the mic is denied, unplugged or switched, or voice detection fails to load, how the mic comes back after the Jarvis page crashes or reloads, and whether "hearing" becomes a part of Jarvis Health.
- **How the Orb, Floating Orb and Caption show the new states.** This waits on the new Jarvis State(s) and on the privacy decision.
- **Very long Utterances.** Monologues and pauses mid-thought. Nan returns a 524 timeout for audio over about 2 minutes, so long speech needs cutting in pauses or capping. This depends on the end-of-turn pause.
- **The Jarvis page in a background tab or on a phone.** The browser may throttle or suspend audio work in a background tab, and phones behave differently again. How far "works on the Jarvis page" reaches is still open.

## Out of scope

<!-- work consciously ruled beyond the destination: gist + why, linking the closed ticket -->

- **A wake word ("Hey Jarvis…")**: nothing usable exists for a Spanish speaker. It becomes possible once Jarvis is in English, so it's a follow-up to that effort. See [How a conversation opens](issues/07-how-a-conversation-opens.md) and [Can a wake word be detected locally?](issues/04-wake-word.md).
- **Turning hands-free off by voice**: a tap does the same job; it belongs with the wake word follow-up. See [How a conversation opens](issues/07-how-a-conversation-opens.md).
- **Jarvis in English** (UI, persona, Replies, voice): the Owner's own follow-up effort, noted in `.scratch/english/idea.md`.
